import type { Config } from "./config.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export async function edcJson(
  cfg: Config,
  method: HttpMethod,
  url: string,
  body?: unknown
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: {
      "X-Api-Key": cfg.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  const isJson = (res.headers.get("content-type") ?? "").includes(
    "application/json"
  );
  const parsed = isJson && text ? safeJson(text) : text;

  if (!res.ok) {
    const msg =
      typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
    throw new Error(
      `HTTP ${res.status} ${res.statusText} for ${method} ${url}\n${msg}`
    );
  }

  return parsed;
}

export async function edcJsonRaw(
  cfg: Config,
  method: HttpMethod,
  url: string,
  rawJsonString: string
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: {
      "X-Api-Key": cfg.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: rawJsonString,
  });

  const text = await res.text();
  const isJson = (res.headers.get("content-type") ?? "").includes(
    "application/json"
  );
  const parsed = isJson && text ? safeJson(text) : text;

  if (!res.ok) {
    const msg =
      typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2);
    throw new Error(
      `HTTP ${res.status} ${res.statusText} for ${method} ${url}\n${msg}`
    );
  }

  return parsed;
}

export function firstObj<T = any>(v: any): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return (v[0] ?? null) as T | null;
  if (typeof v === "object") return v as T;
  return null;
}

export async function waitForState(
  cfg: Config,
  url: string,
  getState: (body: any) => string | null | undefined,
  wanted: string,
  maxSeconds = 60
): Promise<any> {
  let last: any = null;
  for (let i = 0; i < maxSeconds; i++) {
    last = await fetchJsonNoThrow(cfg, url);
    const state = last ? getState(last) : null;
    if (state === wanted) return last;
    await sleep(1000);
  }
  throw new Error(
    `Timed out waiting for state=${wanted} at ${url}\nLast=${JSON.stringify(
      last,
      null,
      2
    )}`
  );
}

async function fetchJsonNoThrow(cfg: Config, url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { "X-Api-Key": cfg.apiKey, Accept: "application/json" },
  });
  const text = await res.text();
  return safeJson(text);
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
