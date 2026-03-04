import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

interface LineTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  id_token?: string;
}

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const savedState = request.cookies.get("line_oauth_state")?.value;

  // Validate state to prevent CSRF
  if (!state || state !== savedState) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }

  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=access_denied", request.url));
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.LINE_CALLBACK_URL!,
        client_id: process.env.LINE_CHANNEL_ID!,
        client_secret: process.env.LINE_CHANNEL_SECRET!,
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(new URL("/login?error=token_failed", request.url));
    }

    const tokenData: LineTokenResponse = await tokenResponse.json();

    // Get user profile from LINE
    const profileResponse = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileResponse.ok) {
      return NextResponse.redirect(new URL("/login?error=profile_failed", request.url));
    }

    const profile: LineProfile = await profileResponse.json();

    // Look up employee by LINE user ID
    const empResult = await pool.query(
      "SELECT * FROM odg_employee WHERE line_id = $1",
      [profile.userId]
    );

    const employee = empResult.rows[0] || null;

    // Store session with employee info
    const sessionData = {
      lineUserId: profile.userId,
      lineDisplayName: profile.displayName,
      linePictureUrl: profile.pictureUrl || null,
      employee: employee
        ? {
            employeeId: employee.employee_id,
            employeeCode: employee.employee_code,
            fullnameLo: employee.fullname_lo,
            fullnameEn: employee.fullname_en,
            titleLo: employee.title_lo,
            titleEn: employee.title_en,
            nickname: employee.nickname,
            positionCode: employee.position_code,
            divisionCode: employee.division_code,
            departmentCode: employee.department_code,
            unitCode: employee.unit_code,
            hireDate: employee.hire_date,
            employmentStatus: employee.employment_status,
          }
        : null,
    };

    const response = NextResponse.redirect(new URL("/home", request.url));

    response.cookies.set(
      "session",
      Buffer.from(JSON.stringify(sessionData)).toString("base64"),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      }
    );

    // Clean up OAuth state cookie
    response.cookies.delete("line_oauth_state");

    return response;
  } catch (err) {
    console.error("LINE callback error:", err);
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
}
