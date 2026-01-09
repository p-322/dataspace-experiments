# Experiment 01 — De stadsmuur met een poort

**Hello, Connector**

Dit experiment is het eerste technische fundament onder de dataspace-reeks.  
Het laat zien hoe je van een **lege REST-API** een **dataspace-endpoint** maakt door er een Eclipse Dataspace Connector (EDC) vóór te zetten.

Niet door data te verplaatsen, te kopiëren of te centraliseren — maar door **toegang contractueel en technisch af te dwingen**.

Dit is de eerste stadspoort.

---

## Wat dit experiment laat zien

In dit experiment bouw je:

- één **bron-API** (een minimale HTTP-service);
- één **EDC Provider** die deze API beschermt;
- één **EDC Consumer** die toegang wil;
- een **volledig dataspace-proces**, uitgevoerd stap voor stap.

Je ziet expliciet:

- hoe data _niet_ publiek wordt;
- hoe toegang pas ontstaat **na contractonderhandeling**;
- hoe de uiteindelijke HTTP-call alleen werkt met een geldige, tijdelijke autorisatie.

De kernboodschap:

> EDC is geen dataportaal.  
> EDC is het contractmechanisme dat bepaalt _of_ een dataportaal mag bestaan — per consument, per afspraak.

---

## Architectuur in één oogopslag

```
Consumer
  |
  |  (catalog, negotiation, transfer)
  v
EDC Consumer  ───────────────┐
                              │  dataspace protocol
EDC Provider ────────────────┘
  |
  |  (token-protected HTTP)
  v
Bron-API (Fastify)
```

- **Control plane**: catalogus, contractonderhandeling, transferafspraken.
- **Data plane**: tijdelijke endpoint + token → echte HTTP-call.
- **Geen centrale datahub. Geen proxy. Geen kopieën.**

---

## Repository-structuur

```
exp-01-de-stadsmuur-met-een-poort
├─ compose/
│  └─ docker-compose.yml
├─ scripts/
│  └─ start-containers.sh
├─ src/
│  ├─ dataspace-process/
│  │  ├─ steps/
│  │  │  ├─ 01-ensure-asset.ts
│  │  │  ├─ 02-ensure-contract-definition.ts
│  │  │  ├─ 03-fetch-catalog.ts
│  │  │  ├─ 04-negotiate-contract.ts
│  │  │  ├─ 05-start-transfer.ts
│  │  │  ├─ 06-fetch-edr.ts
│  │  │  └─ 07-data-access.ts
│  │  ├─ config.ts
│  │  ├─ http.ts
│  │  ├─ run.ts
│  │  └─ types.ts
│  └─ server.ts
├─ Dockerfile
├─ package.json
├─ tsconfig.json
└─ exp-01-blog.md
```

---

## Vereisten

- Docker + Docker Compose
- Node.js ≥ 22
- npm

---

## Snel starten

### 1. Start de containers

```bash
./scripts/start-containers.sh
```

### 2. Run het dataspace-proces

```bash
npm run smoketest
```

---

## De 7 stappen van het experiment

Elke stap representeert een erkende dataspace-handeling:

1. Asset registreren (provider)
2. Contractdefinitie instellen (provider)
3. Catalogus ophalen (consumer)
4. Contract onderhandelen (consumer → provider)
5. Transfer starten (consumer)
6. Endpoint Data Reference ophalen (consumer)
7. Data benaderen via HTTP (consumer)

---

## Wat dit experiment bewust níet doet

- Geen identity federation
- Geen usage control
- Geen logging of provenance
- Geen meerdere bronnen of consumers

Dit is het minimale skelet waarop alles verder bouwt.
