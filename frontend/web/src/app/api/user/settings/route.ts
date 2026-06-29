import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env } from "@/env";
import { apiRequest } from "@/lib/api-client";

export async function PUT(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = (session as any).accessToken as string | null;
    if (!accessToken) {
      return NextResponse.json(
        { error: "No backend token. Please sign out and sign back in." },
        { status: 403 }
      );
    }

    const { username, name, bio, image } = await req.json();
    const requestId = req.headers.get("x-request-id") || "";

    const backendUrl = env.BACKEND_API_URL;
    const res = await apiRequest(`${backendUrl}/api/user/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        // Forward the backend-issued JWT so the authenticate middleware accepts the request
        "Authorization": `Bearer ${accessToken}`,
        "X-Request-ID": requestId,
      },
      body: JSON.stringify({ username, name, bio, image }),
      actionName: "Proxy PUT /api/user/settings",
      userId: session.user.id,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Settings proxy error:", error);
    return NextResponse.json(
      { error: "Backend API is unreachable" },
      { status: 500 }
    );
  }
}

