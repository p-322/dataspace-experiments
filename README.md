# Dataspace Experiments (EDC / Sovity CE)

This repository contains a set of runnable, local experiments that demonstrate **dataspace transactions** using the **Eclipse Dataspace Connector (EDC)** via **Sovity Community Edition**, combined with a small **TypeScript / Node.js** codebase that orchestrates the transaction steps.

The experiments are intentionally hands-on: you run everything locally, watch containers start, see contract negotiations finalize, and retrieve data through a controlled endpoint.

## About the blog series

This repository accompanies a series of blog posts published by P-322 Consultancy on dataspaces, digital heritage, and access governance.

Rather than starting from policy documents or architectural diagrams, the blogs work the other way around: they begin with running code. Each experiment in this repository is used to explore a concrete question — what actually happens when data is shared under conditions, who decides, and where responsibility lives in the infrastructure.

The blogs document the reasoning behind the experiments, the design choices that were made, and the things that broke along the way. They are written for people who work at the intersection of heritage, data infrastructure, and policy — not just developers, but also architects, strategists, and decision-makers who want to understand what “dataspaces” mean in practice.

You can read the blogs on https://p-322.com, and follow the experiments here to reproduce, inspect, or extend them yourself. The code and the writing are meant to be read together.

## Overview

Each experiment follows the same general setup:

- **Docker containers** provide the runtime environment:
  - a minimal HTTP API that serves example data
  - PostgreSQL databases for connector state
  - one provider connector and one or more consumer connectors (Sovity EDC CE)
- **TypeScript** code models the dataspace transaction flow step by step
- **npm scripts** manage the lifecycle

The focus is not on abstraction, but on observability: you should be able to see what happens in the control plane and when the data plane takes over.

## Prerequisites

You need the following installed locally:

- Docker (with Docker Compose support)
- Node.js (recent LTS recommended)
- npm

No cloud services or external infrastructure are required.

## Getting started

Clone the repository and navigate into one of the experiment directories. Each experiment is self-contained.

Install dependencies:

    npm install

Run the full experiment from a clean state:

    npm run clean-experiment

If `clean-experiment` is not available, run the steps explicitly:

    npm run clean
    npm run init
    npm run experiment

## npm scripts explained

The scripts are intentionally repetitive across experiments to keep behavior predictable.

### npm run clean

Stops the Docker Compose stack and removes volumes.

Purpose:
- reset all state
- ensure databases and connectors start fresh

This typically runs Docker Compose with volume cleanup.

### npm run init

Starts the Docker Compose stack and waits until required services are reachable.

Purpose:
- bring up databases, connectors, and the sample API
- avoid race conditions by polling management endpoints until they respond

### npm run build

Compiles the TypeScript sources to JavaScript using the local TypeScript configuration.

Purpose:
- produce runnable output for Node.js

### npm run experiment

Builds the code and runs the experiment driver.

Purpose:
- execute the dataspace transaction against the running connectors
- log each step so you can follow what happens

### npm run clean-experiment

Convenience command that combines:

- clean
- init
- experiment

This is the recommended command while iterating on experiments.

### Other scripts

Experiments may also define:

- `npm run dev` – run the example API server in watch mode

## What happens during an experiment

Most experiments follow the same conceptual sequence:

1. The provider registers an asset and an offer.
2. The consumer fetches the provider catalog.
3. A contract negotiation is started (control plane).
4. A transfer process is initiated (control plane).
5. The consumer retrieves an Endpoint Data Reference (EDR).
6. The consumer accesses data through the provider data plane using the EDR.

Console output will usually include agreement IDs, transfer process IDs, and EDR tokens so you can observe isolation between consumers and transactions.

## Troubleshooting

If something behaves unexpectedly, start by resetting everything:

    npm run clean-experiment

If you see timeouts waiting for a state change, it usually means a connector or database was not ready yet. Re-running `init` or increasing wait times typically resolves this.

Port conflicts can occur if local services already use the same ports as the Docker containers. In that case, stop the conflicting service or adjust the port mappings in Docker Compose and corresponding environment variables.

This typically happens when you just ran an experiment, and moved on to the next. Going back to the earlier folder and run `npm run clean` destroys the containers, leaving you free to execute the next experiment.

## License

See the LICENSE file in the repository.

This project is released under the GNU Affero General Public License (AGPL-3.0).
That means you are free to use, study, modify, and share it — as long as those freedoms are preserved.

If you want to use this software commercially, embed it in a proprietary product, offer it as part of a paid service, or avoid the copyleft obligations of the AGPL, we’re happy to talk.

P-322 Consultancy offers commercial licensing, support, and tailored implementations for organizations that want to build on this work professionally.

👉 Get in touch via https://p-322.com to discuss licensing options, architecture support, or custom development.
