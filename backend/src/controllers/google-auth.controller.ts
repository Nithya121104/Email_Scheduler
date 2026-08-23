import "dotenv/config";

import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET;

  const callbackUrl =
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:5000/auth/google/callback";

  return {
    clientId,
    clientSecret,
    callbackUrl,
  };
}

export function googleLogin(
  _req: Request,
  res: Response
) {
  const {
    clientId,
    callbackUrl,
  } = getGoogleConfig();

  console.log(
    "========== GOOGLE LOGIN =========="
  );

  console.log(
    "Client ID configured:",
    Boolean(clientId)
  );

  console.log(
    "Callback URL:",
    callbackUrl
  );

  console.log(
    "=================================="
  );

  if (!clientId) {
    return res.status(500).json({
      message:
        "GOOGLE_CLIENT_ID is not configured",
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid profile email",
    access_type: "offline",
    prompt: "select_account",
  });

  const googleAuthUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    params.toString();

  return res.redirect(
    googleAuthUrl
  );
}

export async function googleCallback(
  req: Request,
  res: Response
) {
  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "        GOOGLE CALLBACK RECEIVED"
  );
  console.log(
    "========================================"
  );

  try {
    const {
      clientId,
      clientSecret,
      callbackUrl,
    } = getGoogleConfig();

    console.log(
      "Client ID configured:",
      Boolean(clientId)
    );

    console.log(
      "Client Secret configured:",
      Boolean(clientSecret)
    );

    console.log(
      "Callback URL:",
      callbackUrl
    );

    if (!clientId) {
      return res.status(500).json({
        message:
          "GOOGLE_CLIENT_ID is not configured",
      });
    }

    if (!clientSecret) {
      return res.status(500).json({
        message:
          "GOOGLE_CLIENT_SECRET is not configured",
      });
    }

    const code =
      typeof req.query.code === "string"
        ? req.query.code
        : undefined;

    const googleError =
      typeof req.query.error === "string"
        ? req.query.error
        : undefined;

    if (googleError) {
      console.error(
        "Google returned an error:",
        googleError
      );

      return res.status(401).json({
        message:
          `Google authorization failed: ${googleError}`,
      });
    }

    if (!code) {
      return res.status(400).json({
        message:
          "Google authorization code missing",
      });
    }

    console.log(
      "Authorization code received"
    );

    const tokenResponse =
      await fetch(
        "https://oauth2.googleapis.com/token",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body:
            new URLSearchParams({
              code,

              client_id:
                clientId,

              client_secret:
                clientSecret,

              redirect_uri:
                callbackUrl,

              grant_type:
                "authorization_code",
            }).toString(),
        }
      );

    const tokenText =
      await tokenResponse.text();

    if (!tokenResponse.ok) {
      console.error(
        "Google token exchange failed:",
        tokenText
      );

      return res.status(401).json({
        message:
          "Failed to authenticate with Google",

        error:
          tokenText,
      });
    }

    let tokens: {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      refresh_token?: string;
    };

    try {
      tokens =
        JSON.parse(tokenText);
    } catch {
      return res.status(401).json({
        message:
          "Invalid response from Google",
      });
    }

    if (!tokens.access_token) {
      return res.status(401).json({
        message:
          "Google access token missing",
      });
    }

    console.log(
      "Google access token received"
    );

    const profileResponse =
      await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization:
              `Bearer ${tokens.access_token}`,
          },
        }
      );

    const profileText =
      await profileResponse.text();

    if (!profileResponse.ok) {
      console.error(
        "Google profile request failed:",
        profileText
      );

      return res.status(401).json({
        message:
          "Failed to retrieve Google profile",

        error:
          profileText,
      });
    }

    let profile: {
      id?: string;
      name?: string;
      email?: string;
      picture?: string;
    };

    try {
      profile =
        JSON.parse(profileText);
    } catch {
      return res.status(401).json({
        message:
          "Invalid Google profile response",
      });
    }

    console.log(
      "Google profile:",
      {
        id: profile.id,
        name: profile.name,
        email: profile.email,
      }
    );

    if (
      !profile.id ||
      !profile.email
    ) {
      return res.status(400).json({
        message:
          "Google profile information is incomplete",
      });
    }

    const googleId =
      profile.id;

    const name =
      profile.name ||
      profile.email;

    const email =
      profile.email;

    const avatar =
      profile.picture || null;

    let user =
      await prisma.user.findUnique({
        where: {
          googleId,
        },
      });

    if (!user) {
      const existingEmailUser =
        await prisma.user.findUnique({
          where: {
            email,
          },
        });

      if (existingEmailUser) {
        user =
          await prisma.user.update({
            where: {
              id: existingEmailUser.id,
            },

            data: {
              googleId,
              name,
              avatar,
            },
          });
      } else {
        user =
          await prisma.user.create({
            data: {
              googleId,
              name,
              email,
              avatar,
            },
          });
      }
    } else {
      user =
        await prisma.user.update({
          where: {
            id: user.id,
          },

          data: {
            name,
            email,
            avatar,
          },
        });
    }

    req.session.userId =
      user.id;

    console.log(
      "Session created for user:",
      user.id
    );

    await new Promise<void>(
      (resolve, reject) => {
        req.session.save(
          (error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          }
        );
      }
    );

    console.log(
      "Session saved successfully"
    );

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "http://localhost:5173";

    console.log(
      "Redirecting to:",
      frontendUrl
    );

    console.log(
      "GOOGLE LOGIN SUCCESSFUL"
    );

    return res.redirect(
      frontendUrl
    );
  } catch (error) {
    console.error(
      "Google OAuth error:",
      error
    );

    return res.status(500).json({
      message:
        "Google authentication failed",

      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
}