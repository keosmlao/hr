import { NextResponse } from "next/server";
import { createLineOAuthState } from "@/lib/line-oauth-state";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function getCallbackUrl(request: Request) {
  const requestUrl = new URL(request.url);

  if (isLocalHost(requestUrl.hostname)) {
    return new URL("/api/auth/line/callback", requestUrl).toString();
  }

  return process.env.LINE_CALLBACK_URL || new URL("/api/auth/line/callback", requestUrl).toString();
}

export async function GET(request: Request) {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const callbackUrl = getCallbackUrl(request);

  if (!channelId || !channelSecret) {
    return NextResponse.json(
      { error: "LINE Login is not configured" },
      { status: 500 }
    );
  }

  const state = createLineOAuthState(channelSecret);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: callbackUrl,
    state,
    scope: "profile openid",
  });

  const authorizeUrl = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;

  return NextResponse.redirect(authorizeUrl);
}
