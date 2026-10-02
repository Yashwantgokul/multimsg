import prisma from "../db";
import { draftReply } from "../agent/pi";

async function main() {
  console.log("Seeding fake conversation...");

  // 1. Create a fake channel account
  const account = await prisma.channelAccount.upsert({
    where: {
      channel_externalAccountId: {
        channel: "WHATSAPP",
        externalAccountId: "1234567890"
      }
    },
    update: {},
    create: {
      channel: "WHATSAPP",
      externalAccountId: "1234567890",
      tokenRef: "fake_token"
    }
  });

  // 2. Create a fake contact
  const contact = await prisma.contact.create({
    data: {
      displayName: "Alice",
    }
  });

  // 3. Create a conversation
  const conversation = await prisma.conversation.create({
    data: {
      channelAccountId: account.id,
      contactId: contact.id,
      externalThreadId: "wa_thread_1"
    }
  });

  const incomingText = "Hey! Can you send me the documents for the OmniAgent project?";

  // 4. Create an incoming message
  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      externalMessageId: "msg_" + Date.now(),
      direction: "INBOUND",
      text: incomingText
    }
  });

  // 5. Create an agent task
  const task = await prisma.agentTask.create({
    data: {
      conversationId: conversation.id,
      status: "PROCESSING"
    }
  });

  console.log("Generating reply draft with Pi Agent (Ollama)...");
  
  try {
    const draftText = await draftReply({
      incomingMessage: incomingText,
      recentContext: ""
    });

    console.log("Draft generated:", draftText);

    // 6. Save the draft
    await prisma.replyDraft.create({
      data: {
        taskId: task.id,
        body: draftText,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
        status: "PENDING"
      }
    });

    // Update task status
    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: "COMPLETED" }
    });

    console.log("Seeding completed! You can now view this in the dashboard.");
  } catch (error) {
    console.error("Failed to generate draft. Is Ollama running?");
    console.error(error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
