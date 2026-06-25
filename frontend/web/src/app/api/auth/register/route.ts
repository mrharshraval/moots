import { NextResponse } from "next/server";
import { env } from "@/env";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const backendUrl = env.BACKEND_API_URL;
    const res = await fetch(`${backendUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": req.headers.get("user-agent") || "",
        "X-Forwarded-For": req.headers.get("x-forwarded-for") || "",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Register proxy error:", error);
    return NextResponse.json(
      { error: "Backend API is unreachable" },
      { status: 500 }
    );
  }
}
