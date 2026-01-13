import type { Config } from "../config.js";
import { consumer } from "../helpers.js";
import type { EdrResult } from "../types.js";

export async function accessData(cfg: Config, edr: EdrResult): Promise<any> {
  console.log(consumer(`Accessing provider data via the EDR-issued endpoint`));
  console.log(
    consumer(`This is the first moment where we leave the EDC APIs entirely`)
  );
  console.log(
    consumer(
      `From here on, this is a plain HTTP request — but one that only works because a contract exists`
    )
  );

  const auth =
    cfg.authHeaderMode === "bearer" ? `Bearer ${edr.token}` : edr.token;

  console.log(
    consumer(`Using Authorization header mode: ${cfg.authHeaderMode}`)
  );
  console.log(
    consumer(`Calling provider public endpoint: ${edr.endpointHost}/`)
  );
  console.log(
    consumer(
      `NOTE: Without a valid contract, this endpoint would reject the request`
    )
  );
  console.log(
    consumer(
      `NOTE: The token is scoped, temporary, and tied to the negotiated agreement`
    )
  );

  const res = await fetch(`${edr.endpointHost}/`, {
    headers: {
      Authorization: auth,
      Accept: "application/json",
    },
  });

  console.log(consumer(`Provider responded with HTTP ${res.status}`));

  const text = await res.text();
  let parsed: any = text;

  try {
    parsed = JSON.parse(text);
    console.log(consumer(`Response body is valid JSON`));
  } catch {
    console.log(consumer(`Response body is not JSON, returning raw text`));
  }

  if (!res.ok) {
    console.log(consumer(`ERROR: Data access failed`));
    throw new Error(
      `Data access failed: HTTP ${res.status}\n${
        typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)
      }`
    );
  }

  console.log(consumer(`Data access successful`));
  console.log(
    consumer(
      `What you are seeing now is the protected resource, delivered through the dataspace contract`
    )
  );
  console.log(
    consumer(
      `The connector is no longer involved in the data path — only in making this access legitimate`
    )
  );

  return parsed;
}
