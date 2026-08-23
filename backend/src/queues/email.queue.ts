import { Queue } from "bullmq";

import { redis } from "../config/redis.js";

export const EMAIL_QUEUE_NAME = "email-scheduler";

export interface SendEmailJob {
  emailId: string;
}

export const emailQueue =
  new Queue<SendEmailJob>(
    EMAIL_QUEUE_NAME,
    {
      connection: redis,

      defaultJobOptions: {
        attempts: 3,

        backoff: {
          type: "exponential",
          delay: 5000,
        },

        removeOnComplete: {
          count: 1000,
        },

        removeOnFail: {
          count: 5000,
        },
      },
    }
  );