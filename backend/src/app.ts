import "dotenv/config";

import express from "express";
import session from "express-session";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import emailRoutes from "./routes/email.routes.js";

const app = express();

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

app.use(
  express.json()
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(
  session({
    secret:
      process.env.SESSION_SECRET ||
      "development-secret-change-this",

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge:
        1000 *
        60 *
        60 *
        24 *
        7,
    },
  })
);

app.use(
  "/auth",
  authRoutes
);

app.use(
  "/api/emails",
  emailRoutes
);

app.get(
  "/health",
  (_req, res) => {
    res.json({
      status: "ok",
    });
  }
);

export default app;