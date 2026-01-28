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

  // Consumers
  consumers: Array<{
    pid: string;
    mgmtBaseUrl: string;
  }>;

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

  // --- Consumer transactions ---
  let i = 0;
  for (const c of cfg.consumers) {
    i++;
    const consumer = new Consumer(
      c.pid,
      c.mgmtBaseUrl,
      cfg.apiKey,
      logger.scoped(`[consumer-${i}]`)
    );
    const tx = consumer.transaction(provider);
    await tx.run("raw");
  }

  return { ok: true as const };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
