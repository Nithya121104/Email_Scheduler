import { google } from "googleapis";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri =
  process.env.GOOGLE_CALLBACK_URL ||
  "http://localhost:5000/auth/google/callback";

if (!clientId) {
  throw new Error("GOOGLE_CLIENT_ID is missing");
}

if (!clientSecret) {
  throw new Error("GOOGLE_CLIENT_SECRET is missing");
}

export const googleOAuthClient =
  new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

export function getGoogleAuthUrl(
  state: string
) {
  return googleOAuthClient.generateAuthUrl({
    access_type: "online",

    scope: [
      "openid",
      "email",
      "profile",
    ],

    state,

    include_granted_scopes: true,
  });
}

export async function getGoogleUser(
  code: string
) {
  const { tokens } =
    await googleOAuthClient.getToken(code);

  googleOAuthClient.setCredentials(tokens);

  const oauth2 =
    google.oauth2({
      auth: googleOAuthClient,
      version: "v2",
    });

  const { data } =
    await oauth2.userinfo.get();

  if (!data.id) {
    throw new Error(
      "Google account ID not returned"
    );
  }

  if (!data.email) {
    throw new Error(
      "Google email not returned"
    );
  }

  return {
    googleId: data.id,

    email: data.email,

    name:
      data.name ||
      data.email.split("@")[0],

    avatar:
      data.picture || null,
  };
}