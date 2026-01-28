# Experiment 03

**Hello, Connector (under stress)**

This experiment builds directly on Experiment 02.  
Where Experiment 02 established multiple _well-behaved_ consumers, this experiment asks a more uncomfortable question:

> What happens if one consumer tries to misuse the credentials of another?

The goal is not to demonstrate a vulnerability, but to understand **where responsibility and enforcement live** in a dataspace architecture.

---

## What this experiment demonstrates

In this experiment, we introduce a third consumer that deliberately behaves maliciously.

We explore three concrete scenarios:

- attempting to retrieve another consumer’s **EDR** from the provider;
- attempting to start a transfer using another consumer’s **contract agreement**;
- attempting to access data using a **stolen but still valid EDR token**.

Each scenario maps to a specific phase of the dataspace transaction and tests a different boundary between the control plane and the data plane.

---

## Conceptual focus

This experiment is not about “breaking security”.  
It is about understanding **what the dataspace does and does not guarantee**.

The central insight:

> The control plane enforces _who_ may negotiate and _under which agreement_.  
> The data plane enforces _nothing beyond possession of a valid token_.

If a token leaks, the data plane will do exactly what it is designed to do: deliver data.

That behaviour is intentional.

---

## Architecture at a glance

```
Consumer 1 ─┐
            ├─ EDC Consumer ───────────────┐
Consumer 2 ─┤                                │  dataspace protocol
            │                                │
Consumer 3 ─┘                          EDC Provider
                                            |
                                            |  (token-protected HTTP)
                                            v
                                     Source API (Fastify)
```

- One provider, one asset, one offer.
- Multiple consumers with isolated agreements.
- One consumer attempting to reuse another’s credentials.

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
2. execute valid transactions for consumer-1 and consumer-2;
3. run misuse scenarios using consumer-3;
4. print the resulting errors and outcomes.

---

## What happens during the experiment

The experiment proceeds in phases:

1. Two consumers complete valid dataspace transactions.
2. A third consumer attempts to:
   - fetch an EDR using someone else’s agreement ID;
   - initiate a transfer using someone else’s agreement;
   - access data using a valid EDR token obtained out-of-band.
3. The results are observed and logged.

You will see that:

- misuse attempts in the **control plane** are rejected;
- misuse in the **data plane** succeeds if the token is valid.

---

## Why this behaviour is expected

A dataspace is not a DRM system.

Once a provider has agreed to share data under certain conditions, enforcement shifts:

- **Before access**: enforced by negotiation, policy, and identity.
- **During transport**: enforced by cryptographic possession of a token.
- **After delivery**: enforced by contractual and legal means.

Short-lived EDR tokens exist precisely to limit the blast radius of leakage.

---

## What this experiment deliberately does _not_ do

- No token binding to network identity
- No runtime re-evaluation of policies
- No auditing or anomaly detection
- No attempt to “fix” misuse

Those concerns belong to governance, monitoring, and organisational design — not to the connector alone.

This experiment exists to make that boundary explicit.
