import type { Config } from "../config.js";
import { consumer } from "../helpers.js";
import { edcJsonRaw, waitForState } from "../http.js";
import type {
  CatalogResult,
  NegotiationResult,
  TransferResult,
} from "../types.js";

export async function startTransfer(
  cfg: Config,
  cat: CatalogResult,
  neg: NegotiationResult
): Promise<TransferResult> {
  console.log(
    consumer(`Preparing transfer request for agreement '${neg.agreementId}'`)
  );
  console.log(
    consumer(
      `This step turns a legal agreement into an actual right to access data`
    )
  );
  console.log(
    consumer(
      `Transfer type is HttpData-PULL: the consumer will actively pull data from the provider`
    )
  );
  console.log(consumer(`Provider participantId=${cat.providerPid}`));
  console.log(consumer(`Provider DSP address=${cfg.providerDspDocker}`));

  console.log(consumer(`Building TransferRequest`));
  console.log(
    consumer(
      `NOTE: Sovity EDC CE expects a simplified TransferRequest shape here`
    )
  );
  console.log(
    consumer(
      `Using a full JSON-LD TransferRequest would cause a server error (this is a known pitfall)`
    )
  );

  const req = {
    "@context": { "@vocab": "https://w3id.org/edc/v0.0.1/ns/" },
    "@type": "TransferRequest",
    contractId: neg.agreementId,
    protocol: "dataspace-protocol-http",
    connectorId: cat.providerPid,
    counterPartyAddress: cfg.providerDspDocker,
    transferType: "HttpData-PULL",
  };

  console.log(
    consumer(`Submitting TransferRequest to consumer management API`)
  );
  console.log(consumer(`Endpoint: ${cfg.consumerMgmt}/v3/transferprocesses`));

  const created = await edcJsonRaw(
    cfg,
    "POST",
    `${cfg.consumerMgmt}/v3/transferprocesses`,
    JSON.stringify(req)
  );

  const transferProcessId = created?.["@id"];
  if (!transferProcessId) {
    console.log(consumer(`Transfer process creation failed. No @id returned`));
    throw new Error(
      `No transfer @id returned:\n${JSON.stringify(created, null, 2)}`
    );
  }

  console.log(
    consumer(`Transfer process created with id=${transferProcessId}`)
  );
  console.log(
    consumer(`Transfer process is now orchestrated by both connectors`)
  );
  console.log(consumer(`Waiting for transfer process to reach state STARTED`));

  await waitForState(
    cfg,
    `${cfg.consumerMgmt}/v3/transferprocesses/${transferProcessId}`,
    (b) => b?.state,
    "STARTED",
    60
  );

  console.log(consumer(`Transfer process is STARTED`));
  console.log(
    consumer(
      `This means the provider has accepted the transfer and prepared access`
    )
  );
  console.log(
    consumer(
      `No data has flowed yet; only the conditions for access are now in place`
    )
  );

  return { transferProcessId };
}
