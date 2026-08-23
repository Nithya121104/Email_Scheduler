import "dotenv/config";

import { Worker } from "bullmq";

import {
  EMAIL_QUEUE_NAME,
  SendEmailJob,
} from "../queues/email.queue.js";

import { redis } from "../config/redis.js";
import { prisma } from "../db/prisma.js";
import { sendEmail } from "../services/email.service.js";
import { reserveEmailSend } from "../services/rate-limit.service.js";

const concurrency = Number(
  process.env.WORKER_CONCURRENCY || 1
);

async function processEmail(
  emailId: string
) {
  const email =
    await prisma.email.findUnique({
      where: {
        id: emailId,
      },
      include: {
        campaign: true,
      },
    });

  if (!email) {
    console.log(
      `Email ${emailId} not found`
    );

    return {
      skipped: true,
      reason: "email-not-found",
    };
  }

  if (email.status === "SENT") {
    console.log(
      `Email ${email.id} already sent`
    );

    return {
      skipped: true,
      reason: "already-sent",
    };
  }

  const rateLimit =
    await reserveEmailSend(
      email.campaign.id,
      email.campaign.hourlyLimit,
      email.campaign.delayBetweenEmails
    );

  if (!rateLimit.allowed) {
    const waitMs =
      Math.max(
        100,
        rateLimit.waitMs
      );

    console.log(
      `Rate limit reached for ${email.id}`
    );

    console.log(
      `Reason: ${rateLimit.reason}`
    );

    console.log(
      `Waiting ${waitMs}ms`
    );

    await new Promise<void>(
      (resolve) => {
        setTimeout(
          resolve,
          waitMs
        );
      }
    );

    return processEmail(
      emailId
    );
  }

  await prisma.email.update({
    where: {
      id: email.id,
    },
    data: {
      status: "PROCESSING",
      attempts: {
        increment: 1,
      },
    },
  });

  try {
    console.log(
      `Sending email to ${email.recipient}`
    );

    const result =
      await sendEmail({
        to: email.recipient,
        subject: email.subject,
        body: email.body,
      });

    await prisma.email.update({
      where: {
        id: email.id,
      },
      data: {
        status: "SENT",
        sentAt: new Date(),
        messageId:
          result.messageId,
        previewUrl:
          result.previewUrl,
        error: null,
      },
    });

    console.log(
      `Email sent successfully to ${email.recipient}`
    );

    if (result.previewUrl) {
      console.log(
        `Preview: ${result.previewUrl}`
      );
    }

    return {
      success: true,
      emailId: email.id,
      recipient:
        email.recipient,
      messageId:
        result.messageId,
      previewUrl:
        result.previewUrl,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      `Failed to send email ${email.id}:`,
      errorMessage
    );

    await prisma.email.update({
      where: {
        id: email.id,
      },
      data: {
        status: "FAILED",
        error: errorMessage,
      },
    });

    throw error;
  }
}

const worker =
  new Worker<SendEmailJob>(
    EMAIL_QUEUE_NAME,

    async (job) => {
      console.log("");
      console.log(
        "========================================"
      );
      console.log(
        `Processing job ${job.id}`
      );
      console.log(
        `Email ID: ${job.data.emailId}`
      );
      console.log(
        "========================================"
      );

      return processEmail(
        job.data.emailId
      );
    },

    {
      connection: redis,
      concurrency,
    }
  );

worker.on(
  "completed",
  (job) => {
    console.log(
      `Job ${job.id} completed`
    );
  }
);

worker.on(
  "failed",
  (job, error) => {
    console.error(
      `Job ${job?.id} failed:`,
      error.message
    );
  }
);

worker.on(
  "error",
  (error) => {
    console.error(
      "Worker error:",
      error
    );
  }
);

async function shutdown() {
  console.log(
    "Shutting down email worker..."
  );

  await worker.close();

  await redis.quit();

  await prisma.$disconnect();

  process.exit(0);
}

process.on(
  "SIGINT",
  shutdown
);

process.on(
  "SIGTERM",
  shutdown
);

console.log(
  "========================================"
);

console.log(
  "ReachInbox Email Worker Started"
);

console.log(
  `Concurrency: ${concurrency}`
);

console.log(
  "Rate limits: campaign-specific"
);

console.log(
  "========================================"
);