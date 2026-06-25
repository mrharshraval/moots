import { NextResponse } from "next/server";
import { env } from "@/env";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const backendUrl = env.BACKEND_API_URL;
    const res = await fetch(`${backendUrl}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Verify OTP proxy error:", error);
    return NextResponse.json(
      { error: "Backend API is unreachable" },
      { status: 500 }
    );
  }
}
