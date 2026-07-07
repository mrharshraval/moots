import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/auth/token
 *
 * Proxies the backend-issued moots_session cookie to the backend refresh endpoint
 * to securely obtain a short-lived access token.
 * 
 * Works for both Logged-In Users and Guest sessions.
 */
export async function GET() {
  const cookieStore = await cookies();
  const mootsSession = cookieStore.get("moots_session")?.value;

  console.log({ "mootsSession": `${mootsSession}` }, { "cookieStore": cookieStore });

  if (!mootsSession) {
    return NextResponse.json(
      { error: "No session token available. Please sign in or start as guest." },
      { status: 401 }
    );
  }

  try {
    const backendUrl = process.env.BACKEND_API_URL || "http://localhost:3002";
    const refreshRes = await fetch(`${backendUrl}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Cookie": `moots_session=${mootsSession}`,
        "Content-Type": "application/json"
      }
    });

    if (refreshRes.ok) {
      const json = await refreshRes.json();
      const freshToken = json.data?.accessToken;

      if (freshToken) {
        const response = NextResponse.json({ accessToken: freshToken });
        const setCookie = refreshRes.headers.get("Set-Cookie");
        if (setCookie) {
          response.headers.append("Set-Cookie", setCookie);
        }
        return response;
      }
    }

    return NextResponse.json(
      { error: "Session expired or invalid" },
      { status: 401 }
    );
  } catch (e) {
    console.error("Backend token refresh failed:", e);
    return NextResponse.json(
      { error: "Failed to communicate with authentication service" },
      { status: 500 }
    );
  }
}
