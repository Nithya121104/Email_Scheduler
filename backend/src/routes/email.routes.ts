import { Router } from "express";

import {
  scheduleEmails,
  getScheduledEmails,
  getSentEmails,
} from "../controllers/email.controller.js";

import {
  requireAuth,
} from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/schedule",
  requireAuth,
  scheduleEmails
);

router.get(
  "/scheduled",
  requireAuth,
  getScheduledEmails
);

router.get(
  "/sent",
  requireAuth,
  getSentEmails
);

export default router;