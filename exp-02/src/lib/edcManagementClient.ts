export class EdcManagementClient {
  constructor(readonly baseUrl: string, readonly apiKey: string) {}

  async json(method: string, path: string, body?: any): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {}

    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status} ${method} ${this.baseUrl}${path}\n${
          typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)
        }`
      );
    }
    return parsed;
  }

  async raw(method: string, path: string, rawBody: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "X-Api-Key": this.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: rawBody,
    });

    const text = await res.text();
    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {}

    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status} ${method} ${this.baseUrl}${path}\n${
          typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)
        }`
      );
    }
    return parsed;
  }

  async waitForState<T = any>(
    path: string,
    getState: (body: any) => string | undefined,
    desired: string,
    timeoutSeconds = 60
  ): Promise<T> {
    const deadline = Date.now() + timeoutSeconds * 1000;
    let last: any = null;

    while (Date.now() < deadline) {
      const body = await this.json("GET", path);
      last = body;
      if (getState(body) === desired) return body as T;
      await new Promise((r) => setTimeout(r, 1000));
    }

    throw new Error(
      `Timeout waiting for state '${desired}' at ${
        this.baseUrl
      }${path}\nLast=${JSON.stringify(last, null, 2)}`
    );
  }
}
