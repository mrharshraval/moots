import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const proxy = NextAuth(authConfig).auth;

export const config = {
  // Protect all paths except auth APIs, static files, and public assets
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
