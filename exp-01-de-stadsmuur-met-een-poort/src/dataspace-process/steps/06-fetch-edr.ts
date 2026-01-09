import type { Config } from "../config.js";
import { consumer } from "../helpers.js";
import { firstObj } from "../http.js";
import type { EdrResult, TransferResult } from "../types.js";

export async function fetchEdr(
  cfg: Config,
  tr: TransferResult
): Promise<EdrResult> {
  const url = `${cfg.consumerMgmt}/v3/edrs/${tr.transferProcessId}/dataaddress`;

  console.log(
    consumer(
      `Fetching EDR (Endpoint Data Reference) for transferProcessId='${tr.transferProcessId}'`
    )
  );
  console.log(
    consumer(
      `This step is where the contract world turns into an actual HTTP call you can make`
    )
  );
  console.log(
    consumer(
      `We ask the consumer connector: “Given this transfer, what temporary access details did the provider issue?”`
    )
  );
  console.log(consumer(`Endpoint: ${url}`));
  console.log(
    consumer(`Polling because the EDR may not exist immediately after STARTED`)
  );

  let last: any = null;

  for (let i = 0; i < 60; i++) {
    const attempt = i + 1;
    console.log(consumer(`EDR poll attempt ${attempt}/60`));

    const res = await fetch(url, {
      headers: { "X-Api-Key": cfg.apiKey, Accept: "application/json" },
    });

    const text = await res.text();
    try {
      last = JSON.parse(text);
    } catch {
      last = text;
    }

    const obj = firstObj<any>(last);
    const token = obj?.authorization;
    const endpointDocker = obj?.endpoint;

    if (token && endpointDocker) {
      console.log(consumer(`EDR is available`));
      console.log(
        consumer(`Provider public endpoint (docker): ${endpointDocker}`)
      );
      console.log(
        consumer(
          `Received authorization token (length=${String(token).length})`
        )
      );
      console.log(
        consumer(
          `NOTE: this token is short-lived and scoped to this agreement/transfer`
        )
      );
      console.log(
        consumer(
          `Next step will use this token to call the provider's public API`
        )
      );

      const endpointHost = endpointDocker.replace(
        "http://edc-provider:11005/api/public",
        cfg.providerPublicHostBase
      );

      console.log(
        consumer(`Provider public endpoint (host):   ${endpointHost}`)
      );
      console.log(
        consumer(
          `The docker->host rewrite exists only because we are calling from the host machine, not from inside the docker network`
        )
      );

      return { endpointDocker, endpointHost, token };
    }

    console.log(
      consumer(
        `EDR not ready yet (missing 'authorization' and/or 'endpoint'). Waiting...`
      )
    );

    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(consumer(`ERROR: Timed out waiting for EDR`));
  throw new Error(
    `EDR not ready or unexpected response from ${url}\nLast=${JSON.stringify(
      last,
      null,
      2
    )}`
  );
}
