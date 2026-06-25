import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { env } from "./env";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        const identifier = credentials.identifier as string;
        const password = credentials.password as string;

        try {
          const backendUrl = env.BACKEND_API_URL;
          const res = await fetch(`${backendUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password }),
          });

          if (!res.ok) {
            return null;
          }

          const data = await res.json();
          return data.user || null;
        } catch (err) {
          console.error("Backend login request failed:", err);
          return null;
        }
      },
    }),
  ],
});
