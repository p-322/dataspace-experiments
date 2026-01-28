import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/hello", async () => {
  return {
    message: "Hello, Dataspace",
    ts: new Date().toISOString(),
    dataset: [{ id: "a1", title: "Example record", license: "CC0" }],
  };
});

app.get("/health", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 7070);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
