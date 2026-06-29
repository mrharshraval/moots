import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * GET /api/auth/token
 *
 * Returns the backend-issued accessToken for the currently authenticated user.
 * Used by client-side code to authenticate WebSocket connections.
 *
 * Security: This route is protected by the server-side NextAuth session.
 * The token is never stored in localStorage — it is fetched fresh each time
 * a WebSocket connection is opened.
 */
export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = (session as any).accessToken as string | null;

  if (!accessToken) {
    return NextResponse.json(
      { error: "No backend token available. Please sign out and sign back in." },
      { status: 403 }
    );
  }

  return NextResponse.json({ accessToken });
}
