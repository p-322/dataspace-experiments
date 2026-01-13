# Experiment 01 — The city wall with a gate

**Hello, Connector**

This experiment forms the first technical foundation of the data space series.  
It shows how you turn an **empty REST API** into a **data space endpoint** by placing an Eclipse Data space Connector (EDC) in front of it.

Not by moving, copying, or centralising data — but by **enforcing access contractually and technically**.

This is the first city gate.

---

## What this experiment demonstrates

In this experiment, you build:

- one **source API** (a minimal HTTP service);
- one **EDC Provider** that protects this API;
- one **EDC Consumer** that wants access;
- a **complete data space process**, executed step by step.

You will explicitly see:

- how data does _not_ become public;
- how access only exists **after contract negotiation**;
- how the final HTTP call only works with a valid, temporary authorisation.

The core message:

> EDC is not a data portal.  
> EDC is the contract mechanism that decides _whether_ a data portal may exist — per consumer, per agreement.

---

## Architecture at a glance

```
Consumer
  |
  |  (catalog, negotiation, transfer)
  v
EDC Consumer  ───────────────┐
                              │  data space protocol
EDC Provider ────────────────┘
  |
  |  (token-protected HTTP)
  v
Source API (Fastify)
```

- **Control plane**: catalog, contract negotiation, transfer agreements.
- **Data plane**: temporary endpoint + token → actual HTTP call.
- **No central data hub. No proxy. No copies.**

---

## Repository structure

```
exp-01
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

## Requirements

- Docker + Docker Compose
- Node.js ≥ 22
- npm

---

## Quick start

### 1. Start the containers

```bash
./scripts/start-containers.sh
```

### 2. Run the data space process

```bash
npm run clean-experiment
```

---

## The 7 steps of the experiment

Each step represents a recognised data space operation:

1. Register asset (provider)
2. Set contract definition (provider)
3. Fetch catalog (consumer)
4. Negotiate contract (consumer → provider)
5. Start transfer (consumer)
6. Fetch Endpoint Data Reference (consumer)
7. Access data via HTTP (consumer)

---

## What this experiment deliberately does _not_ do

- No identity federation
- No usage control
- No logging or provenance
- No multiple sources or consumers

This is the minimal skeleton on which everything else is built.
