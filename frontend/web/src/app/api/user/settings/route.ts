import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { env } from "@/env";

export async function PUT(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, name, bio, image } = await req.json();

    const backendUrl = env.BACKEND_API_URL;
    const res = await fetch(`${backendUrl}/api/user/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: session.user.id,
        username,
        name,
        bio,
        image,
      }),
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
