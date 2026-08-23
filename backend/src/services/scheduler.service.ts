import { emailQueue } from "../queues/email.queue.js";

export async function scheduleEmailJob(
  emailId: string,
  scheduledAt: Date
) {
  const delay = Math.max(
    0,
    scheduledAt.getTime() - Date.now()
  );

  await emailQueue.add(
    "send-email",
    {
      emailId,
    },
    {
      jobId: emailId,
      delay,
      attempts: 1,
    }
  );

  console.log(
    `Email ${emailId} scheduled for ${scheduledAt.toISOString()}`
  );
}