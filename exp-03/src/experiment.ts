// Implements the three “reuse” attempts:
//
// 1) Guaranteed failure: consumer-3 cannot retrieve consumer-2’s EDR from consumer-3 mgmt API
// 2) Likely failure: consumer-3 cannot use consumer-2’s agreementId to start a transfer
// 3) Not guaranteed: consumer-3 reusing consumer-2’s EDR token for direct HTTP access

import { Consumer } from "./lib/consumer.js";
import { Provider, PublicationSpec } from "./lib/provider.js";
import { Logger } from "./utils/logger.js";

type RunConfig = {
  apiKey: string;

  // Provider (host-facing mgmt) + (docker-facing dsp)
  providerPid: string;
  providerMgmtBaseUrl: string;
  providerDspAddressDocker: string;
  providerPublicBaseHost: string;

  // Publications (provider)
  publications: PublicationSpec[];

  // Consumers (1 and 2 run full tx)
  consumers: Array<{
    pid: string;
    mgmtBaseUrl: string;
  }>;

  // Consumer-3 (reuse attempts)
  consumer3: {
    pid: string;
    mgmtBaseUrl: string;
  };

  // Step 7
  authHeaderMode?: "bearer" | "raw";
};

function loadRunConfig(): RunConfig {
  const apiKey = process.env.API_KEY ?? "SomeOtherApiKey";

  return {
    apiKey,

    providerPid: process.env.PROVIDER_PID ?? "provider",
    providerMgmtBaseUrl:
      process.env.PROVIDER_MGMT ?? "http://localhost:11012/api/management",
    providerDspAddressDocker:
      process.env.PROVIDER_DSP_DOCKER ?? "http://edc-provider:11003/api/dsp",
    providerPublicBaseHost:
      process.env.PROVIDER_PUBLIC_HOST ?? "http://localhost:11015/api/public",

    publications: [
      {
        assetId: process.env.ASSET_ID ?? "asset-hello-1",
        contractDefId: process.env.CONTRACT_DEF_ID ?? "cd-hello-1",
        policyId: process.env.POLICY_ID ?? "always-true",
        // docker-internal URL
        sourceUrl: process.env.SOURCE_URL ?? "http://api:7070/hello",
      },
    ],

    consumers: [
      {
        pid: process.env.CONSUMER_1_PID ?? "consumer-1",
        mgmtBaseUrl:
          process.env.CONSUMER_1_MGMT ??
          "http://localhost:12012/api/management",
      },
      {
        pid: process.env.CONSUMER_2_PID ?? "consumer-2",
        mgmtBaseUrl:
          process.env.CONSUMER_2_MGMT ??
          "http://localhost:22012/api/management",
      },
    ],

    consumer3: {
      pid: process.env.CONSUMER_3_PID ?? "consumer-3",
      mgmtBaseUrl:
        process.env.CONSUMER_3_MGMT ?? "http://localhost:32012/api/management",
    },

    authHeaderMode: (process.env.AUTH_HEADER_MODE as "bearer" | "raw") ?? "raw",
  };
}

export async function run() {
  const cfg = loadRunConfig();
  const logger = new Logger();

  // --- Provider setup ---
  const provider = new Provider(
    cfg.providerPid,
    cfg.providerMgmtBaseUrl,
    cfg.apiKey,
    cfg.providerDspAddressDocker,
    cfg.providerPublicBaseHost,
    logger.scoped("setup")
  );

  logger.s("== Provider setup: assets + contract definitions ==");
  for (const pub of cfg.publications) {
    logger.s(`== Ensure asset '${pub.assetId}' ==`);
    await provider.ensureAsset(pub);

    logger.s(`== Ensure contract definition '${pub.contractDefId}' ==`);
    await provider.ensureContractDefinition(pub);
  }

  // --- Consumer transactions (1 and 2) ---
  const results: Array<{
    consumerPid: string;
    r: any; // keep flexible; we mainly need r.cat/r.neg/r.tr/r.edr
  }> = [];

  for (const c of cfg.consumers) {
    const consumer = new Consumer(
      c.pid,
      c.mgmtBaseUrl,
      cfg.apiKey,
      logger.scoped(`[${c.pid}]`)
    );
    const tx = consumer.transaction(provider);
    const r = await tx.run(cfg.authHeaderMode ?? "raw");
    results.push({ consumerPid: c.pid, r });
  }

  const r2 = results.at(1)?.r;
  if (!r2?.tr?.transferProcessId || !r2?.neg?.agreementId || !r2?.edr?.token) {
    throw new Error(
      `Missing consumer-2 results. Need r2.tr.transferProcessId, r2.neg.agreementId, r2.edr.token. Got:\n${JSON.stringify(
        r2,
        null,
        2
      )}`
    );
  }

  // --- Consumer-3 reuse attempts ---
  const consumer3 = new Consumer(
    cfg.consumer3.pid,
    cfg.consumer3.mgmtBaseUrl,
    cfg.apiKey,
    logger.scoped(`[${cfg.consumer3.pid}]`)
  );

  logger.s("== Reuse attempts (consumer-3) ==");

  // 1) Guaranteed failure: consumer-3 cannot retrieve consumer-2’s EDR from consumer-3 mgmt API
  logger.s(
    "== 1) consumer-3 fetches consumer-2 EDR via management API (should fail) =="
  );
  try {
    const tp2 = r2.tr.transferProcessId as string;
    await consumer3.mgmt.json(
      "GET",
      `/v3/edrs/${encodeURIComponent(tp2)}/dataaddress`
    );
    logger.err(
      `Unexpected success: consumer-3 retrieved an EDR for consumer-2 transferProcessId=${tp2}`
    );
  } catch (e: any) {
    logger.w(`Expected failure: ${String(e?.message ?? e)}`);
  }

  // 2) Likely failure: consumer-3 cannot use consumer-2’s agreementId to start a transfer
  logger.s(
    "== 2) consumer-3 starts transfer using consumer-2 agreementId (should fail) =="
  );
  try {
    const created = await consumer3.mgmt.raw(
      "POST",
      `/v3/transferprocesses`,
      JSON.stringify({
        "@context": { "@vocab": "https://w3id.org/edc/v0.0.1/ns/" },
        "@type": "TransferRequest",
        contractId: r2.neg.agreementId,
        protocol: "dataspace-protocol-http",
        connectorId: r2.cat.providerPid,
        counterPartyAddress: provider.dspAddressDocker,
        transferType: "HttpData-PULL",
      })
    );

    logger.err(
      `Unexpected success: consumer-3 started transfer with consumer-2 agreementId. Response:\n${JSON.stringify(
        created,
        null,
        2
      )}`
    );
  } catch (e: any) {
    logger.w(`Expected failure: ${String(e?.message ?? e)}`);
  }

  // 3) Not guaranteed: consumer-3 reusing consumer-2’s EDR token for direct HTTP access
  logger.s(
    "== 3) consumer-3 uses consumer-2 EDR token directly (may succeed or fail) =="
  );
  try {
    const authMode = cfg.authHeaderMode ?? "raw";
    const auth =
      authMode === "bearer" ? `Bearer ${r2.edr.token}` : r2.edr.token;

    const res = await fetch(`${r2.edr.endpointHost}/`, {
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    });

    const text = await res.text();
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {}

    if (!res.ok) {
      logger.w(
        `Token reuse blocked (HTTP ${res.status}). Body:\n${
          typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)
        }`
      );
    } else {
      logger.w(
        `Token reuse succeeded (HTTP ${
          res.status
        }). This means “whoever has the token can use it” in this setup.\nBody:\n${
          typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)
        }`
      );
    }
  } catch (e: any) {
    logger.w(`Token reuse attempt errored: ${String(e?.message ?? e)}`);
  }

  return { ok: true as const };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
