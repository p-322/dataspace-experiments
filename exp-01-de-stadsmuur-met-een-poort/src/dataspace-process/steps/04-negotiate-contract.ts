import type { Config } from "../config.js";
import { consumer } from "../helpers.js";
import { edcJsonRaw, waitForState } from "../http.js";
import { normalizeOfferForContractRequest } from "../normalizeOfferForContractRequest.js";
import type { CatalogResult, NegotiationResult } from "../types.js";

export async function negotiateContract(
  cfg: Config,
  cat: CatalogResult
): Promise<NegotiationResult> {
  const consumerPid = cfg.consumerPid ?? "consumer";

  console.log(consumer(`Preparing ContractRequest for asset '${cat.assetId}'`));
  console.log(
    consumer(
      `This is where we formally ask the provider for permission to use the asset`
    )
  );
  console.log(
    consumer(
      `Provider participantId=${cat.providerPid}, Consumer participantId=${consumerPid}`
    )
  );
  console.log(consumer(`Counterparty DSP address=${cfg.providerDspDocker}`));

  console.log(
    consumer(`Normalizing offer into a valid ODRL Offer for a ContractRequest`)
  );
  console.log(
    consumer(
      `This step is crucial: missing target/assigner/assignee will cause negotiation to fail`
    )
  );

  const req = {
    "@context": {
      "@vocab": "https://w3id.org/edc/v0.0.1/ns/",
      edc: "https://w3id.org/edc/v0.0.1/ns/",
      odrl: "http://www.w3.org/ns/odrl/2/",
    },
    "@type": "edc:ContractRequest",
    "edc:counterPartyAddress": cfg.providerDspDocker,
    "edc:counterPartyId": cat.providerPid,
    "edc:protocol": "dataspace-protocol-http",
    "edc:policy": normalizeOfferForContractRequest({
      offer: cat.offer,
      assetId: cat.assetId,
      providerPid: cat.providerPid,
      consumerPid,
    }),
  };

  console.log(
    consumer(`Submitting ContractRequest to consumer management API`)
  );
  console.log(
    consumer(`Endpoint: ${cfg.consumerMgmt}/v3/contractnegotiations`)
  );

  const created = await edcJsonRaw(
    cfg,
    "POST",
    `${cfg.consumerMgmt}/v3/contractnegotiations`,
    JSON.stringify(req)
  );

  const negotiationId = created?.["@id"];
  if (!negotiationId) {
    console.log(
      consumer(`Contract negotiation request failed. No @id returned`)
    );
    throw new Error(
      `No negotiation @id returned:\n${JSON.stringify(created, null, 2)}`
    );
  }

  console.log(
    consumer(`Contract negotiation created with id=${negotiationId}`)
  );
  console.log(
    consumer(`Negotiation is now asynchronous and handled via the DSP protocol`)
  );
  console.log(consumer(`Waiting for negotiation to reach state FINALIZED`));

  const finalized = await waitForState(
    cfg,
    `${cfg.consumerMgmt}/v3/contractnegotiations/${negotiationId}`,
    (b) => b?.state,
    "FINALIZED",
    60
  );

  const agreementId = finalized?.contractAgreementId;
  if (!agreementId) {
    console.log(
      consumer(
        `Negotiation reached FINALIZED state but no contractAgreementId was returned`
      )
    );
    throw new Error(
      `No contractAgreementId on finalized negotiation:\n${JSON.stringify(
        finalized,
        null,
        2
      )}`
    );
  }

  console.log(consumer(`Contract negotiation finalized successfully`));
  console.log(consumer(`AgreementId=${agreementId}`));
  console.log(
    consumer(
      `This agreement is the legal basis for any subsequent data transfer`
    )
  );

  return { negotiationId, agreementId };
}
