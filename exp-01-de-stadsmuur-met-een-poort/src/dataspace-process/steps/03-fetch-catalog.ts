import type { Config } from "../config.js";
import { consumer } from "../helpers.js";
import { edcJson, firstObj } from "../http.js";
import { normalizeOfferForContractRequest } from "../normalizeOfferForContractRequest.js";
import type { CatalogResult } from "../types.js";

export async function fetchCatalog(cfg: Config): Promise<CatalogResult> {
  console.log(
    consumer(`Requesting catalog from provider via consumer management API`)
  );
  console.log(
    consumer(`We ask our own EDC to fetch the provider's catalog over DSP`)
  );
  console.log(consumer(`Provider DSP address: ${cfg.providerDspDocker}`));
  console.log(consumer(`Protocol: dataspace-protocol-http`));

  const catalog = await edcJson(
    cfg,
    "POST",
    `${cfg.consumerMgmt}/v3/catalog/request`,
    {
      "@type": "https://w3id.org/edc/v0.0.1/ns/CatalogRequest",
      "https://w3id.org/edc/v0.0.1/ns/counterPartyAddress":
        cfg.providerDspDocker,
      "https://w3id.org/edc/v0.0.1/ns/protocol": "dataspace-protocol-http",
      "https://w3id.org/edc/v0.0.1/ns/querySpec": {
        "@type": "https://w3id.org/edc/v0.0.1/ns/QuerySpec",
        "https://w3id.org/edc/v0.0.1/ns/offset": 0,
        "https://w3id.org/edc/v0.0.1/ns/limit": 50,
      },
    }
  );

  console.log(
    consumer(
      `Catalog response received. Now extracting provider participantId and first dataset`
    )
  );

  const providerPid = catalog?.["dspace:participantId"] ?? "provider";
  console.log(consumer(`providerPid=${providerPid}`));

  const dataset = firstObj<any>(catalog?.["dcat:dataset"]);
  if (!dataset) {
    console.log(
      consumer(
        `No dataset found. This usually means the provider did not publish any assets (or contract definition does not match)`
      )
    );
    throw new Error(
      `No dcat:dataset in catalog:\n${JSON.stringify(catalog, null, 2)}`
    );
  }

  const assetId = dataset?.["@id"];
  const offer = dataset?.["odrl:hasPolicy"];
  if (!assetId || !offer) {
    console.log(
      consumer(
        `Dataset exists but is missing '@id' or 'odrl:hasPolicy'. Without these we cannot negotiate a contract`
      )
    );
    throw new Error(
      `Missing @id or odrl:hasPolicy in dataset:\n${JSON.stringify(
        dataset,
        null,
        2
      )}`
    );
  }

  console.log(consumer(`assetId=${assetId}`));
  console.log(
    consumer(
      `Offer found. This offer is what we will send back in step 04 as part of the ContractRequest`
    )
  );

  const consumerPid = cfg.consumerPid ?? "consumer";
  console.log(consumer(`consumerPid=${consumerPid}`));

  console.log(
    consumer(
      `Normalizing offer for ContractRequest (adding target/assigner/assignee)`
    )
  );
  console.log(
    consumer(
      `Why: the catalog offer may be incomplete for the management API, and missing fields previously caused 400/500 errors`
    )
  );

  const normalizedOffer = normalizeOfferForContractRequest({
    offer,
    assetId,
    providerPid,
    consumerPid,
  });

  console.log(
    consumer(
      `Normalized offer ready. Next step can submit a ContractRequest without guessing missing ODRL fields`
    )
  );

  return { providerPid, assetId, offer: normalizedOffer };
}
