// src/consumer/EdcTransaction.ts
import { firstObj } from "../utils/collections.js";
import { Logger } from "../utils/logger.js";
import { EdcManagementClient } from "./edcManagementClient.js";
import { Provider } from "./provider.js";

/* ------------------------------------------------------------
 * Types local to the transaction
 * ------------------------------------------------------------ */

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [k: string]: Json };

export type JsonObject = { [k: string]: Json };
export type OfferPolicy = JsonObject;

export type CatalogResult = {
  providerPid: string;
  assetId: string;
  offer: OfferPolicy;
};

export type NegotiationResult = {
  negotiationId: string;
  agreementId: string;
};

export type TransferResult = {
  transferProcessId: string;
};

export type EdrResult = {
  endpointDocker: string;
  endpointHost: string;
  token: string;
};

/* ------------------------------------------------------------
 * EdcTransaction
 * ------------------------------------------------------------ */

export class EdcTransaction {
  constructor(
    readonly consumerPid: string,
    readonly mgmt: EdcManagementClient,
    readonly provider: Provider,
    private readonly log: ReturnType<Logger["scoped"]>
  ) {}

  /* ------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------ */

  normalizeOfferForContractRequest(input: {
    offer: OfferPolicy;
    assetId: string;
    providerPid: string;
    consumerPid: string;
  }): JsonObject {
    const { offer, assetId, providerPid, consumerPid } = input;

    return {
      ...offer,
      "@type": "odrl:Offer",
      "odrl:target": { "@id": assetId },
      "odrl:assigner": { "@id": providerPid },
      "odrl:assignee": { "@id": consumerPid },
    };
  }

  /* ------------------------------------------------------------
   * Orchestration
   * ------------------------------------------------------------ */

  async run(authHeaderMode: "bearer" | "raw" = "raw") {
    this.log.s(`Transaction: Fetch catalog + offer`, { nl: true });
    const cat = await this.fetchCatalog();

    this.log.s(`Transaction: Contract negotiation`, { nl: true });
    const neg = await this.negotiateContract(cat);

    this.log.s(`Transaction: Transfer process`, { nl: true });
    const tr = await this.startTransfer(cat, neg);

    this.log.s(`Transaction: Fetch EDR`, { nl: true });
    const edr = await this.fetchEdr(tr);

    this.log.s(`Transaction: Data access`, { nl: true });
    const data = await this.accessData(edr, authHeaderMode);

    return { cat, neg, tr, edr, data };
  }

  /* ------------------------------------------------------------
   * Step 3 — Catalog
   * ------------------------------------------------------------ */

  async fetchCatalog(): Promise<CatalogResult> {
    const l = this.log;

    l.c(`Requesting catalog from provider via consumer management API`);
    l.c(`Provider DSP address: ${this.provider.dspAddressDocker}`);
    l.c(`Protocol: dataspace-protocol-http`);

    const catalog = await this.mgmt.json("POST", `/v3/catalog/request`, {
      "@type": "https://w3id.org/edc/v0.0.1/ns/CatalogRequest",
      "https://w3id.org/edc/v0.0.1/ns/counterPartyAddress":
        this.provider.dspAddressDocker,
      "https://w3id.org/edc/v0.0.1/ns/protocol": "dataspace-protocol-http",
      "https://w3id.org/edc/v0.0.1/ns/querySpec": {
        "@type": "https://w3id.org/edc/v0.0.1/ns/QuerySpec",
        "https://w3id.org/edc/v0.0.1/ns/offset": 0,
        "https://w3id.org/edc/v0.0.1/ns/limit": 50,
      },
    });

    const providerPid = catalog?.["dspace:participantId"] ?? this.provider.pid;

    const dataset = firstObj<any>(catalog?.["dcat:dataset"]);
    if (!dataset) {
      l.c(`No dataset found in catalog`);
      throw new Error(
        `No dcat:dataset in catalog:\n${JSON.stringify(catalog, null, 2)}`
      );
    }

    const assetId = dataset?.["@id"];
    const offer = dataset?.["odrl:hasPolicy"];
    if (!assetId || !offer) {
      throw new Error(
        `Missing @id or odrl:hasPolicy:\n${JSON.stringify(dataset, null, 2)}`
      );
    }

    l.c(`Normalizing offer for ContractRequest`);

    const normalizedOffer = this.normalizeOfferForContractRequest({
      offer,
      assetId,
      providerPid,
      consumerPid: this.consumerPid,
    });

    return { providerPid, assetId, offer: normalizedOffer };
  }

  /* ------------------------------------------------------------
   * Step 4 — Negotiation
   * ------------------------------------------------------------ */

  async negotiateContract(cat: CatalogResult): Promise<NegotiationResult> {
    const l = this.log;

    l.c(`Negotiating contract for asset '${cat.assetId}'`);

    const req = {
      "@context": {
        "@vocab": "https://w3id.org/edc/v0.0.1/ns/",
        edc: "https://w3id.org/edc/v0.0.1/ns/",
        odrl: "http://www.w3.org/ns/odrl/2/",
      },
      "@type": "edc:ContractRequest",
      "edc:counterPartyAddress": this.provider.dspAddressDocker,
      "edc:counterPartyId": cat.providerPid,
      "edc:protocol": "dataspace-protocol-http",
      "edc:policy": cat.offer,
    };

    const created = await this.mgmt.raw(
      "POST",
      `/v3/contractnegotiations`,
      JSON.stringify(req)
    );

    const negotiationId = created?.["@id"];
    if (!negotiationId) {
      throw new Error(`No negotiation @id returned`);
    }

    const finalized = await this.mgmt.waitForState(
      `/v3/contractnegotiations/${encodeURIComponent(negotiationId)}`,
      (b) => b?.state,
      "FINALIZED",
      60
    );

    const agreementId = finalized?.contractAgreementId;
    if (!agreementId) {
      throw new Error(`No contractAgreementId on finalized negotiation`);
    }

    l.c(`Contract finalized: agreementId=${agreementId}`);

    return { negotiationId, agreementId };
  }

  /* ------------------------------------------------------------
   * Step 5 — Transfer
   * ------------------------------------------------------------ */

  async startTransfer(
    cat: CatalogResult,
    neg: NegotiationResult
  ): Promise<TransferResult> {
    const l = this.log;

    l.c(`Starting transfer for agreement '${neg.agreementId}'`);

    const created = await this.mgmt.raw(
      "POST",
      `/v3/transferprocesses`,
      JSON.stringify({
        "@context": { "@vocab": "https://w3id.org/edc/v0.0.1/ns/" },
        "@type": "TransferRequest",
        contractId: neg.agreementId,
        protocol: "dataspace-protocol-http",
        connectorId: cat.providerPid,
        counterPartyAddress: this.provider.dspAddressDocker,
        transferType: "HttpData-PULL",
      })
    );

    const transferProcessId = created?.["@id"];
    if (!transferProcessId) {
      throw new Error(`No transferProcessId returned`);
    }

    await this.mgmt.waitForState(
      `/v3/transferprocesses/${encodeURIComponent(transferProcessId)}`,
      (b) => b?.state,
      "STARTED",
      60
    );

    return { transferProcessId };
  }

  /* ------------------------------------------------------------
   * Step 6 — EDR
   * ------------------------------------------------------------ */

  async fetchEdr(tr: TransferResult): Promise<EdrResult> {
    const l = this.log;

    const path = `/v3/edrs/${encodeURIComponent(
      tr.transferProcessId
    )}/dataaddress`;

    let last: any = null;

    for (let i = 0; i < 60; i++) {
      const res = await fetch(`${this.mgmt.baseUrl}${path}`, {
        headers: { "X-Api-Key": this.mgmt.apiKey },
      });

      const text = await res.text();
      try {
        last = JSON.parse(text);
      } catch {
        last = text;
      }

      const obj = firstObj<any>(last);
      if (obj?.authorization && obj?.endpoint) {
        const endpointHost = obj.endpoint.replace(
          "http://edc-provider:11005/api/public",
          this.provider.publicBaseHost
        );

        l.token("consumer", "EDR token", obj.authorization);
        return {
          endpointDocker: obj.endpoint,
          endpointHost,
          token: obj.authorization,
        };
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    throw new Error(`Timed out waiting for EDR`);
  }

  /* ------------------------------------------------------------
   * Step 7 — Data access
   * ------------------------------------------------------------ */

  async accessData(
    edr: EdrResult,
    authHeaderMode: "bearer" | "raw"
  ): Promise<any> {
    const l = this.log;

    l.c(`Accessing provider data via EDR public endpoint`);
    l.c(`Endpoint: ${edr.endpointHost}/`);
    l.c(`Authorization mode: ${authHeaderMode}`);

    const auth =
      authHeaderMode === "bearer" ? `Bearer ${edr.token}` : edr.token;

    const res = await fetch(`${edr.endpointHost}/`, {
      headers: {
        Authorization: auth,
        Accept: "application/json",
      },
    });

    l.c(`Provider responded with HTTP ${res.status}`);

    const text = await res.text();

    let parsed: any = text;
    let isJson = false;

    try {
      parsed = JSON.parse(text);
      isJson = true;
      l.c(`Response body is valid JSON`);
    } catch {
      l.c(`Response body is not JSON`);
    }

    if (!res.ok) {
      l.err(`Data access failed`);
      throw new Error(
        `Data access failed: HTTP ${res.status}\n${
          typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)
        }`
      );
    }

    l.c(`Transferred data:`);

    if (isJson) {
      if (Array.isArray(parsed)) {
        l.c(`Data shape: array(len=${parsed.length})`);
      } else if (parsed && typeof parsed === "object") {
        l.c(`Data shape: keys=[${Object.keys(parsed).join(", ")}]`);
      } else {
        l.c(`Data type: ${typeof parsed}`);
      }

      l.c(`Payload:\n${JSON.stringify(parsed, null, 2)}`);
    } else {
      l.c(`Payload (text):\n${String(parsed)}`);
    }

    return parsed;
  }
}
