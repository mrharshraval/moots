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
  // #region agent log
  fetch('http://127.0.0.1:7419/ingest/d8e17749-7978-4108-99b8-55f9d5899bec',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'2900a9'},body:JSON.stringify({sessionId:'2900a9',location:'api/auth/token/route.ts:GET',message:'NextAuth token route session check',data:{hasSession:!!session,hasUser:!!session?.user,hasAccessToken:!!(session as any)?.accessToken},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
  // #endregion

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
