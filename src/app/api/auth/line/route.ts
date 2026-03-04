import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const channelId = process.env.LINE_CHANNEL_ID;
  const callbackUrl = process.env.LINE_CALLBACK_URL;

  if (!channelId || !callbackUrl) {
    return NextResponse.json(
      { error: "LINE Login is not configured" },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: callbackUrl,
    state,
    scope: "profile openid",
  });

  const authorizeUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("line_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  return response;
}
