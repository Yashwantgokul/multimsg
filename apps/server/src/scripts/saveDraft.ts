import prisma from "../db";

async function main() {
  const taskId = process.argv[2];
  const draftBody = process.argv[3];

  if (!taskId || !draftBody) {
    console.error("Usage: ts-node saveDraft.ts <taskId> <draftBody>");
    process.exit(1);
  }

  await prisma.replyDraft.create({
    data: {
      taskId: taskId,
      body: draftBody,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  });

  await prisma.agentTask.update({
    where: { id: taskId },
    data: { status: "COMPLETED" }
  });

  console.log(`Draft saved for task ${taskId}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
