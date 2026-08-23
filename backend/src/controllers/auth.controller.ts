import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";

// ============================================================
// GET CURRENT USER
// ============================================================

export async function getCurrentUser(
  req: Request,
  res: Response
) {
  try {
    const userId = req.session?.userId;

    if (!userId) {
      return res.status(401).json({
        authenticated: false,
        message: "Not authenticated",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        googleId: true,
        name: true,
        email: true,
        avatar: true,
      },
    });

    if (!user) {
      req.session.destroy(() => {});

      return res.status(401).json({
        authenticated: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      authenticated: true,
      user,
    });
  } catch (error) {
    console.error(
      "Failed to get current user:",
      error
    );

    return res.status(500).json({
      authenticated: false,
      message: "Failed to get current user",
    });
  }
}


// ============================================================
// LOGOUT
// ============================================================

export async function logout(
  req: Request,
  res: Response
) {
  try {
    req.session.destroy((error) => {
      if (error) {
        console.error(
          "Logout failed:",
          error
        );

        return res.status(500).json({
          message: "Logout failed",
        });
      }

      res.clearCookie("connect.sid");

      return res.status(200).json({
        message: "Logged out successfully",
      });
    });
  } catch (error) {
    console.error(
      "Logout error:",
      error
    );

    return res.status(500).json({
      message: "Logout failed",
    });
  }
}