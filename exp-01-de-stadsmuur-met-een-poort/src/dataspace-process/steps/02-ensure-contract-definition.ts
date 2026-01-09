import type { Config } from "../config.js";
import { provider } from "../helpers.js";
import { edcJson } from "../http.js";

export async function ensureContractDefinition(cfg: Config) {
  console.log(
    provider(
      `Ensuring contract definition '${cfg.contractDefId}' exists for asset '${cfg.assetId}'`
    )
  );

  console.log(
    provider(
      `A contract definition links assets to policies that govern negotiation and access`
    )
  );

  console.log(
    provider(`This experiment uses policy '${cfg.policyId}' (always-true)`)
  );

  console.log(
    provider(
      `'always-true' means: the policy contains no constraints and therefore always evaluates to ALLOW`
    )
  );

  console.log(
    provider(`This does NOT mean the data is public or freely accessible`)
  );

  console.log(
    provider(
      `It means: if a consumer reaches contract negotiation, the policy itself will not block it`
    )
  );

  console.log(
    provider(
      `In later experiments, this policy will be replaced by time-, purpose-, or identity-based rules`
    )
  );

  console.log(
    provider(
      `Binding asset '${cfg.assetId}' to this policy via a contract definition`
    )
  );

  const contractDefBody = {
    "@id": cfg.contractDefId,
    "@type": "https://w3id.org/edc/v0.0.1/ns/ContractDefinition",
    "https://w3id.org/edc/v0.0.1/ns/accessPolicyId": cfg.policyId,
    "https://w3id.org/edc/v0.0.1/ns/contractPolicyId": cfg.policyId,
    "https://w3id.org/edc/v0.0.1/ns/assetsSelector": [
      {
        "@type": "https://w3id.org/edc/v0.0.1/ns/Criterion",
        "https://w3id.org/edc/v0.0.1/ns/operandLeft": "id",
        "https://w3id.org/edc/v0.0.1/ns/operator": "=",
        "https://w3id.org/edc/v0.0.1/ns/operandRight": cfg.assetId,
      },
    ],
  };

  const byIdUrl = `${
    cfg.providerMgmt
  }/v3/contractdefinitions/${encodeURIComponent(cfg.contractDefId)}`;

  try {
    await edcJson(cfg, "GET", byIdUrl);
    console.log(
      provider(`Contract definition '${cfg.contractDefId}' already exists`)
    );
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const is404 =
      msg.includes("HTTP 404") ||
      msg.includes("404 Not Found") ||
      msg.includes("ObjectNotFound");

    if (!is404) throw e;

    await edcJson(
      cfg,
      "POST",
      `${cfg.providerMgmt}/v3/contractdefinitions`,
      contractDefBody
    );
    console.log(provider(`Contract definition '${cfg.contractDefId}' created`));
  }

  console.log(provider(`Contract definition '${cfg.contractDefId}' is active`));

  console.log(
    provider(
      `Result: the asset will appear in the catalog with an offer that is always negotiable`
    )
  );

  console.log(
    provider(
      `Access is still impossible without a successful contract and transfer process`
    )
  );
}
