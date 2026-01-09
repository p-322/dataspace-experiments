import { Config } from "./config.js";
import { step } from "./helpers.js";
import { ensureAsset } from "./steps/01-ensure-asset.js";
import { ensureContractDefinition } from "./steps/02-ensure-contract-definition.js";

export async function runProviderSetup(cfg: Config) {
  console.log(step("== 1) Ensure asset exists (provider) =="));
  await ensureAsset(cfg);

  console.log();
  console.log(
    step("== 2) Ensure contract definition uses always-true (provider) ==")
  );
  await ensureContractDefinition(cfg);

  return { ok: true as const };
}
