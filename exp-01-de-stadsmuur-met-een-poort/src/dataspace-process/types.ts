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

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function asRecord(v: unknown, context: string): Record<string, unknown> {
  if (!isRecord(v)) throw new Error(`${context}: expected object`);
  return v;
}

export function getString(
  obj: Record<string, unknown>,
  key: string,
  context: string
): string {
  const v = obj[key];
  if (typeof v !== "string" || v.length === 0) {
    throw new Error(`${context}: expected non-empty string at '${key}'`);
  }
  return v;
}

export function getOptionalString(
  obj: Record<string, unknown>,
  key: string
): string | undefined {
  const v = obj[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

export function firstObject(
  v: unknown,
  context: string
): Record<string, unknown> {
  if (Array.isArray(v)) {
    if (v.length === 0) throw new Error(`${context}: empty array`);
    return asRecord(v[0], `${context}[0]`);
  }
  return asRecord(v, context);
}

export function asOfferPolicy(v: unknown, context: string): OfferPolicy {
  const obj = asRecord(v, context);
  return obj as unknown as OfferPolicy;
}
