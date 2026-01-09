import type { Config } from "../config.js";
import { provider } from "../helpers.js";
import { edcJson } from "../http.js";

export async function ensureAsset(cfg: Config) {
  console.log(
    provider(
      `Checking whether asset '${cfg.assetId}' already exists in the provider catalog`
    )
  );

  const list = await edcJson(
    cfg,
    "POST",
    `${cfg.providerMgmt}/v3/assets/request`,
    {
      "@type": "https://w3id.org/edc/v0.0.1/ns/QuerySpec",
      "https://w3id.org/edc/v0.0.1/ns/offset": 0,
      "https://w3id.org/edc/v0.0.1/ns/limit": 50,
    }
  );

  const exists =
    Array.isArray(list) && list.some((x) => x?.["@id"] === cfg.assetId);

  if (exists) {
    console.log(
      provider(`Asset '${cfg.assetId}' already exists — skipping creation`)
    );
  } else {
    console.log(
      provider(
        `Asset '${cfg.assetId}' not found — creating new asset definition`
      )
    );

    console.log(
      provider(
        `Registering asset metadata and linking it to the underlying HTTP data source`
      )
    );

    await edcJson(cfg, "POST", `${cfg.providerMgmt}/v3/assets`, {
      "@id": cfg.assetId,
      "@type": "https://w3id.org/edc/v0.0.1/ns/Asset",
      "https://w3id.org/edc/v0.0.1/ns/properties": {
        name: "Hello asset",
      },
      "https://w3id.org/edc/v0.0.1/ns/dataAddress": {
        "@type": "https://w3id.org/edc/v0.0.1/ns/DataAddress",
        "https://w3id.org/edc/v0.0.1/ns/type": "HttpData",
        "https://w3id.org/edc/v0.0.1/ns/baseUrl": "http://api:7070",
        "https://w3id.org/edc/v0.0.1/ns/path": "/hello",
      },
    });

    console.log(
      provider(
        `Asset '${cfg.assetId}' successfully registered in the provider catalog`
      )
    );
  }

  /**
   * Didactic step: show what the underlying data source returns,
   * without involving EDC, contracts, or transfer tokens.
   */
  const sourceUrl = `${cfg.sourceHostBaseUrl}${cfg.sourcePath}`;

  console.log(
    provider(
      `Fetching data directly from the underlying HTTP source (no EDC, no contract)`
    )
  );
  console.log(provider(`Source URL (host-mapped): ${sourceUrl}`));
  console.log(
    provider(
      `This call bypasses the dataspace completely and is shown for reference only`
    )
  );

  try {
    const res = await fetch(sourceUrl, {
      headers: { Accept: "application/json" },
    });
    const text = await res.text();

    let parsed: any = text;
    try {
      parsed = JSON.parse(text);
    } catch {}

    console.log(provider(`Raw source response (reference):`));
    console.log(
      typeof parsed === "string" ? parsed : JSON.stringify(parsed, null, 2)
    );

    console.log(
      provider(
        `NOTE: This is the same data the asset points to, but accessed without any dataspace guarantees`
      )
    );
    console.log(
      provider(
        `In step 7, the consumer will retrieve this data via EDC, using a negotiated contract and transfer token`
      )
    );
  } catch (err) {
    console.log(
      provider(
        `WARNING: Failed to fetch data directly from the underlying source`
      )
    );
    console.log(err instanceof Error ? err.message : err);
  }
}
