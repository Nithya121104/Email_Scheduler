import { Response } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma.js";
import { scheduleEmailJob } from "../services/scheduler.service.js";

import {
  AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const scheduleEmailSchema = z.object({
  subject: z.string().min(1).max(500),

  body: z.string().min(1),

  recipients: z
    .array(z.string().email())
    .min(1),

  startTime: z.coerce.date(),

  delayBetweenEmails: z
    .number()
    .int()
    .min(0),

  hourlyLimit: z
    .number()
    .int()
    .positive(),
});

export async function scheduleEmails(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const result =
      scheduleEmailSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request",
        errors: result.error.flatten(),
      });
    }

    const {
      subject,
      body,
      recipients,
      startTime,
      delayBetweenEmails,
      hourlyLimit,
    } = result.data;

    if (startTime.getTime() <= Date.now()) {
      return res.status(400).json({
        message: "Start time must be in the future",
      });
    }

    const campaign =
      await prisma.emailCampaign.create({
        data: {
          userId: req.user.id,
          subject,
          body,
          startTime,
          delayBetweenEmails,
          hourlyLimit,
        },
      });

    const emails = recipients.map(
      (recipient, index) => {
        const scheduledAt =
          new Date(
            startTime.getTime() +
              index * delayBetweenEmails
          );

        return {
          campaignId: campaign.id,
          recipient,
          subject,
          body,
          scheduledAt,
        };
      }
    );

    const createdEmails =
      await prisma.email.createManyAndReturn({
        data: emails,
      });

    await Promise.all(
      createdEmails.map((email) =>
        scheduleEmailJob(
          email.id,
          email.scheduledAt
        )
      )
    );

    return res.status(201).json({
      message:
        "Emails scheduled successfully",

      campaignId:
        campaign.id,

      totalEmails:
        createdEmails.length,

      emails:
        createdEmails.map((email) => ({
          id: email.id,
          recipient:
            email.recipient,
          scheduledAt:
            email.scheduledAt,
        })),
    });
  } catch (error) {
    console.error(
      "Failed to schedule emails:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to schedule emails",
    });
  }
}

export async function getScheduledEmails(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const emails =
      await prisma.email.findMany({
        where: {
          status: "SCHEDULED",
          campaign: {
            userId: req.user.id,
          },
        },
        orderBy: {
          scheduledAt: "asc",
        },
      });

    return res.status(200).json({
      emails,
      total: emails.length,
    });
  } catch (error) {
    console.error(
      "Failed to fetch scheduled emails:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch scheduled emails",
    });
  }
}

export async function getSentEmails(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const emails =
      await prisma.email.findMany({
        where: {
          status: "SENT",
          campaign: {
            userId: req.user.id,
          },
        },
        orderBy: {
          sentAt: "desc",
        },
      });

    return res.status(200).json({
      emails,
      total: emails.length,
    });
  } catch (error) {
    console.error(
      "Failed to fetch sent emails:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch sent emails",
    });
  }
}