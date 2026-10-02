import Fastify from "fastify";
import "dotenv/config";

const app = Fastify({ logger: true });
const verifyToken = process.env.META_VERIFY_TOKEN!;

app.get("/webhooks/whatsapp", async (request, reply) => {
  const q = request.query as Record<string, string>;
  const valid =
    q["hub.mode"] === "subscribe" &&
    q["hub.verify_token"] === verifyToken &&
    typeof q["hub.challenge"] === "string";

  if (!valid) {
    return reply.code(403).send("Verification failed");
  }

  return reply.type("text/plain").send(q["hub.challenge"]);
});

app.get("/health", async () => ({ status: "ok" }));

app.listen({ port: Number(process.env.PORT || 3001), host: "127.0.0.1" });
