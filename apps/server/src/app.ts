import Fastify from "fastify";
import "dotenv/config";
import prisma from "./db";
import { draftReply } from "./agent/pi";
import cors from "@fastify/cors";
import { Channel } from "@prisma/client";

const app = Fastify({ logger: true });

app.register(cors, {
  origin: "*"
});

const verifyToken = process.env.META_VERIFY_TOKEN || "omniagent_verify_token";

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
      account: true,
      contact: true,
      messages: {
        orderBy: { createdAt: "asc" }
      },
      tasks: {
        include: { drafts: true },
        orderBy: { createdAt: "desc" }
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
      account: true,
      contact: true,
      messages: { orderBy: { createdAt: "asc" } },
      tasks: { include: { drafts: true }, orderBy: { createdAt: "desc" } }
    }
  });
});

// Simulate incoming message from WhatsApp / Instagram / Messenger
app.post("/api/messages/simulate", async (request, reply) => {
  try {
    const body = (request.body || {}) as {
      channel?: "WHATSAPP" | "INSTAGRAM" | "MESSENGER";
      senderName?: string;
      text?: string;
    };

    const channelType = (body.channel || "WHATSAPP") as Channel;
    const senderName = body.senderName?.trim() || "Alex";
    const text = body.text?.trim() || "Hey, can you confirm the project timeline?";

    // 1. Channel Account
    const account = await prisma.channelAccount.upsert({
      where: {
        channel_externalAccountId: {
          channel: channelType,
          externalAccountId: `sim_${channelType.toLowerCase()}_1`
        }
      },
      update: {},
      create: {
        channel: channelType,
        externalAccountId: `sim_${channelType.toLowerCase()}_1`,
        tokenRef: "vault://sim_token"
      }
    });

    // 2. Contact
    const contact = await prisma.contact.create({
      data: {
        displayName: senderName
      }
    });

    // 3. Conversation
    const conversation = await prisma.conversation.create({
      data: {
        channelAccountId: account.id,
        contactId: contact.id,
        externalThreadId: `thread_${Date.now()}`
      }
    });

    // 4. Inbound Message
    const msg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        externalMessageId: `msg_${Date.now()}`,
        direction: "INBOUND",
        text: text
      }
    });

    // 5. Generate Pi Agent Draft
    const proposedReply = await draftReply({
      incomingMessage: text,
      recentContext: `Contact ${senderName} says: ${text}`
    });

    // 6. Create AgentTask & ReplyDraft
    const task = await prisma.agentTask.create({
      data: {
        conversationId: conversation.id,
        status: "COMPLETED",
        drafts: {
          create: {
            body: proposedReply,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
            status: "PENDING"
          }
        }
      },
      include: { drafts: true }
    });

    return reply.code(201).send({
      conversationId: conversation.id,
      message: msg,
      task,
      draft: task.drafts[0]
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({ error: error?.message || "Failed to simulate message" });
  }
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

  await prisma.replyDraft.update({
    where: { id },
    data: { status: "APPROVED" }
  });

  // Record approval
  await prisma.approval.upsert({
    where: { draftId: id },
    create: {
      draftId: id,
      decision: "APPROVED"
    },
    update: {
      decision: "APPROVED",
      decidedAt: new Date()
    }
  });

  return reply.code(202).send({ status: "APPROVED", message: "Reply queued for sending" });
});

app.post("/api/approvals/:id/reject", async (request, reply) => {
  const { id } = request.params as { id: string };
  await prisma.replyDraft.update({
    where: { id },
    data: { status: "REJECTED" }
  });

  await prisma.approval.upsert({
    where: { draftId: id },
    create: {
      draftId: id,
      decision: "REJECTED"
    },
    update: {
      decision: "REJECTED",
      decidedAt: new Date()
    }
  });

  return reply.send({ status: "REJECTED" });
});

app.get("/health", async () => ({ status: "ok" }));

app.listen({ port: Number(process.env.PORT || 3001), host: "0.0.0.0" });
