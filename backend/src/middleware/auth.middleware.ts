import { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma.js";

export interface AuthenticatedUser {
  id: string;
  googleId: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface AuthenticatedRequest
  extends Request {
  user?: AuthenticatedUser;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!user) {
      req.session.destroy(() => {});

      return res.status(401).json({
        message: "User not found",
      });
    }

    req.user = {
      id: user.id,
      googleId: user.googleId,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };

    next();

  } catch (error) {
    console.error(
      "Authentication middleware error:",
      error
    );

    return res.status(500).json({
      message:
        "Authentication check failed",
    });
  }
}