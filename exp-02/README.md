# Experiment 02

**Hello again, Connector**

This experiment builds directly on Experiment 01.  
Where the first experiment established a single dataspace transaction, this one explores what happens when **multiple consumers** approach the same provider.

The focus shifts from “can a dataspace work?” to a more interesting question:

> What does a dataspace look like when more than one visitor shows up at the gate?

Nothing fundamentally new is added to the protocol — instead, the structure of the code changes to make repetition, isolation, and comparison possible.

---

## What this experiment demonstrates

In this experiment, you extend the previous setup to support:

- one **provider** exposing a single asset and offer;
- **multiple consumers**, each negotiating independently;
- repeated dataspace transactions against the same offer;
- explicit separation between **roles** and **transactions**.

You will see:

- that each consumer negotiates its **own contract agreement**;
- that each transfer results in a **distinct EDR token**;
- that identical data access does not imply shared state or shared keys.

The key takeaway:

> A dataspace transaction is not a property of a consumer or a provider.  
> It is a first‑class process with its own lifecycle.

---

## Conceptual shift from experiment 01

Experiment 01 followed a largely procedural flow: one provider, one consumer, one transaction.

In this experiment, the code is reorganised around **roles**:

- the **Provider** is responsible for preparing assets and offers;
- the **Consumer** is responsible for initiating interest;
- the **Transaction** encapsulates negotiation, transfer, and access.

This makes it possible to repeat the same transaction logic for multiple consumers without duplicating code or leaking state between them.

---

## Architecture at a glance

```
Consumer A ─┐
            ├─ EDC Consumer ───────────────┐
Consumer B ─┘                                │  dataspace protocol
                                            │
                                      EDC Provider
                                            |
                                            |  (token-protected HTTP)
                                            v
                                     Source API (Fastify)
```

- **One provider**, one dataset, one offer.
- **Multiple consumers**, each with their own transaction flow.
- Shared infrastructure, isolated agreements.

---

## Requirements

- Docker + Docker Compose
- Node.js ≥ 22
- npm

---

## Quick start

```bash
npm run clean-experiment
```

This will:

1. reset all containers and state;
2. start the provider and consumer connectors;
3. register the asset and offer once;
4. execute a dataspace transaction for each configured consumer.

---

## What happens during the experiment

At runtime, the experiment performs the following sequence:

1. The provider registers the asset and contract definition.
2. The experiment iterates over a list of consumers.
3. For each consumer:
   - the catalog is fetched;
   - a contract negotiation is performed;
   - a transfer process is started;
   - an EDR is retrieved;
   - the data is accessed via HTTP.

Although the same data is returned each time, the **agreements and tokens differ** per consumer.

---

## What this experiment deliberately does _not_ do

- No policy variation between consumers
- No access denial scenarios
- No concurrency stress testing
- No malicious behaviour (this is explored in experiment 03)

This experiment exists to establish a clean baseline for **multiple independent transactions** against the same provider.

Everything that follows builds on this structure.
