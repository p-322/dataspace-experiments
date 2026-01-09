import { Config } from "./config.js";
import { step } from "./helpers.js";
import { fetchCatalog } from "./steps/03-fetch-catalog.js";
import { negotiateContract } from "./steps/04-negotiate-contract.js";
import { startTransfer } from "./steps/05-start-transfer.js";
import { fetchEdr } from "./steps/06-fetch-edr.js";
import { accessData } from "./steps/07-data-access.js";

export async function runTransaction(cfg: Config) {
  console.log();
  console.log(step("== 3) Fetch catalog + offer (consumer) =="));
  const cat = await fetchCatalog(cfg);
  console.log(`providerPid=${cat.providerPid}`);
  console.log(`assetId=${cat.assetId}`);

  console.log();
  console.log(step("== 4) Contract negotiation (consumer -> provider) =="));
  const neg = await negotiateContract(cfg, cat);
  console.log(`negotiationId=${neg.negotiationId}`);
  console.log(`agreementId=${neg.agreementId}`);

  console.log();
  console.log(step("== 5) Transfer process (consumer) =="));
  const tr = await startTransfer(cfg, cat, neg);
  console.log(`transferProcessId=${tr.transferProcessId}`);

  console.log();
  console.log(step("== 6) Fetch EDR dataaddress =="));
  const edr = await fetchEdr(cfg, tr);
  console.log(`endpointDocker=${edr.endpointDocker}`);
  console.log(`endpointHost=${edr.endpointHost}`);
  console.log(`tokenLen=${edr.token.length}`);

  console.log();
  console.log(step("== 7) Data access =="));
  const data = await accessData(cfg, edr);
  console.log(JSON.stringify(data, null, 2));

  return { cat, neg, tr, edr, data };
}
