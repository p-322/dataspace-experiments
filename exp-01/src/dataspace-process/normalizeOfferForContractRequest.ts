import type { OfferPolicy, JsonObject } from "./types.js";

export function normalizeOfferForContractRequest(input: {
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
