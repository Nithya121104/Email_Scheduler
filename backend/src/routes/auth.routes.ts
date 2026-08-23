import { Router } from "express";

import {
  googleLogin,
  googleCallback,
} from "../controllers/google-auth.controller.js";

import {
  getCurrentUser,
  logout,
} from "../controllers/auth.controller.js";

const router = Router();

router.get(
  "/google",
  googleLogin
);

router.get(
  "/google/callback",
  googleCallback
);

router.get(
  "/me",
  getCurrentUser
);

router.post(
  "/logout",
  logout
);

export default router;