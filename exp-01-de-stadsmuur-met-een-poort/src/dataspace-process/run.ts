import { loadConfig } from "./config.js";
import { runProviderSetup } from "./provider-run.js";
import { runTransaction } from "./transaction-run.js";

async function main() {
  const cfg = loadConfig();

  await runProviderSetup(cfg);
  await runTransaction(cfg);

  console.log("OK");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
