import { Logger } from "../utils/logger.js";
import { EdcManagementClient } from "./edcManagementClient.js";

export type PublicationSpec = {
  assetId: string;
  contractDefId: string;
  policyId: string;
  sourceUrl: string;
};

export class Provider {
  readonly mgmt: EdcManagementClient;
  readonly log: Logger;

  constructor(
    readonly pid: string,
    mgmtBaseUrl: string,
    mgmtApiKey: string,
    readonly dspAddressDocker: string,
    readonly publicBaseHost: string,
    logger: Logger
  ) {
    this.mgmt = new EdcManagementClient(mgmtBaseUrl, mgmtApiKey);
    this.log = logger;
  }

  async ensureAsset(pub: PublicationSpec): Promise<void> {
    this.log.p(`Ensuring asset '${pub.assetId}' exists`);

    try {
      await this.mgmt.json(
        "GET",
        `/v3/assets/${encodeURIComponent(pub.assetId)}`
      );
      this.log.p(`Asset '${pub.assetId}' already exists`);
      return;
    } catch (e: any) {
      if (!String(e.message).includes("404")) throw e;
    }

    await this.mgmt.json("POST", `/v3/assets`, {
      "@context": {
        "@vocab": "https://w3id.org/edc/v0.0.1/ns/",
      },
      "@id": pub.assetId,
      "@type": "Asset",

      properties: {
        name: pub.assetId,
        contenttype: "application/json",
      },

      dataAddress: {
        "@type": "HttpData",
        "https://w3id.org/edc/v0.0.1/ns/type": "HttpData",
        baseUrl: pub.sourceUrl,
        proxyPath: "true",
        method: "GET",
      },
    });

    this.log.p(`Asset '${pub.assetId}' created`);
  }

  async ensureContractDefinition(pub: PublicationSpec): Promise<void> {
    this.log.p(`Ensuring contract definition '${pub.contractDefId}' exists`);

    const byId = `/v3/contractdefinitions/${encodeURIComponent(
      pub.contractDefId
    )}`;

    try {
      await this.mgmt.json("GET", byId);
      this.log.p(`Contract definition '${pub.contractDefId}' already exists`);
      return;
    } catch (e: any) {
      if (!String(e.message).includes("404")) throw e;
    }

    await this.mgmt.json("POST", `/v3/contractdefinitions`, {
      "@context": { "@vocab": "https://w3id.org/edc/v0.0.1/ns/" },
      "@id": pub.contractDefId,
      "@type": "ContractDefinition",

      accessPolicyId: pub.policyId,
      contractPolicyId: pub.policyId,

      assetsSelector: [
        {
          "@type": "Criterion",
          operandLeft: "id",
          operator: "=",
          operandRight: pub.assetId,
        },
      ],
    });

    this.log.p(`Contract definition '${pub.contractDefId}' created`);
  }
}
