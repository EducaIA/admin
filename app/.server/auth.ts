// app/services/auth.server.ts
import { Authenticator } from "remix-auth";
import { sessionStorage } from "./session.server";

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
export const authenticator = new Authenticator<{
  email: string;
}>(sessionStorage);

import { GoogleStrategy } from "remix-auth-google";

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NODE_ENV } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.log(process.env);
  throw new Error("You must provide GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET");
}

const googleStrategy = new GoogleStrategy(
  {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback",
  },
  async ({ accessToken, refreshToken, extraParams, profile }) => {
    if ((profile.emails?.[0]?.value ?? "").includes("@educaia.io")) {
      return { email: profile.emails[0].value };
    }

    throw new Error("You must use an educaia.io email to sign in");
  }
);

authenticator.use(googleStrategy);
