import Fastify from "fastify";
import "dotenv/config";
import prisma from "./db";
import { draftReply } from "./agent/pi";
import cors from "@fastify/cors";

const app = Fastify({ logger: true });

app.register(cors, {
  origin: "*"
});

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

// -- Simulated Inbox Routes --

app.get("/api/conversations", async () => {
  return prisma.conversation.findMany({
    include: {
      contact: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      tasks: {
        include: { drafts: true },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });
});

app.get("/api/conversations/:id", async (req) => {
  const { id } = req.params as { id: string };
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      contact: true,
      messages: { orderBy: { createdAt: "asc" } },
      tasks: { include: { drafts: true }, orderBy: { createdAt: "desc" } }
    }
  });
});

app.post("/api/approvals/:id/approve", async (request, reply) => {
  const { id } = request.params as { id: string };
  const draft = await prisma.replyDraft.findUnique({
    where: { id },
    include: { task: true },
  });

  if (!draft || draft.status !== "PENDING") {
    return reply.code(409).send({ error: "Draft is no longer pending" });
  }

  if (draft.expiresAt <= new Date()) {
    await prisma.replyDraft.update({ where: { id }, data: { status: "EXPIRED" } });
    return reply.code(410).send({ error: "Draft expired" });
  }

  // Update status to approved (Atomic transaction stub)
  await prisma.replyDraft.update({
    where: { id },
    data: { status: "APPROVED" }
  });

  return reply.code(202).send({ status: "APPROVED", message: "Reply queued for sending" });
});

app.post("/api/approvals/:id/reject", async (request, reply) => {
  const { id } = request.params as { id: string };
  await prisma.replyDraft.update({
    where: { id },
    data: { status: "REJECTED" }
  });
  return reply.send({ status: "REJECTED" });
});

app.get("/health", async () => ({ status: "ok" }));

app.listen({ port: Number(process.env.PORT || 3001), host: "127.0.0.1" });

