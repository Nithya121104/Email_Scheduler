import { prisma } from "./prisma.js";
import { emailQueue } from "../queues/email.queue.js";

async function main() {
  const email = await prisma.email.findUnique({
    where: {
      id: "cmt5qkwvb0008kouhpad0t9dq",
    },
  });

  if (!email) {
    console.log("Email not found.");
    return;
  }

  console.log("Email found:");
  console.log({
    id: email.id,
    recipient: email.recipient,
    status: email.status,
  });

  await emailQueue.add(
    "send-email",
    {
      emailId: email.id,
    },
    {
      jobId: email.id,
      delay: 0,
    }
  );

  console.log("✅ Email requeued successfully.");
}

main()
  .catch((error) => {
    console.error("❌ Requeue failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });