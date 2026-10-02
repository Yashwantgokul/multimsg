import prisma from "../db";

async function poll() {
  try {
    const task = await prisma.agentTask.findFirst({
      where: { status: "QUEUED" },
      include: {
        conversation: {
          include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } }
        }
      }
    });

    if (task) {
      const msg = task.conversation.messages[0];
      console.log(`\n\n=== NEW MESSAGE INBOUND ===`);
      console.log(`TASK_ID: ${task.id}`);
      console.log(`MESSAGE: ${msg.text}`);
      console.log(`===========================\n`);
      
      // Mark as PROCESSING so we don't pick it up again
      await prisma.agentTask.update({
        where: { id: task.id },
        data: { status: "PROCESSING" }
      });
    }
  } catch (error) {
    console.error("Polling error:", error);
  }

  setTimeout(poll, 2000);
}

console.log("Pi Orchestrator Polling Started...");
poll();
