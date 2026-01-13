export type Config = {
  apiKey: string;

  providerMgmt: string;
  consumerMgmt: string;

  providerDspDocker: string;
  providerPublicHostBase: string;

  assetId: string;
  contractDefId: string;
  policyId: string;
  consumerPid?: string;

  sourceHostBaseUrl: string;
  sourcePath: string;

  authHeaderMode?: "bearer" | "raw";
};

export function loadConfig(): Config {
  return {
    apiKey: process.env.API_KEY ?? "SomeOtherApiKey",

    providerMgmt: "http://localhost:11012/api/management",
    consumerMgmt: "http://localhost:12012/api/management",

    providerDspDocker: "http://edc-provider:11003/api/dsp",
    providerPublicHostBase: "http://localhost:11015/api/public",

    assetId: "asset-hello-1",
    contractDefId: "cd-hello-1",
    policyId: "always-true",

    consumerPid: "consumer",

    // 👇 the real source, before EDC exists
    sourceHostBaseUrl: "http://localhost:7070",
    sourcePath: "/hello",

    authHeaderMode: "raw",
  };
}
