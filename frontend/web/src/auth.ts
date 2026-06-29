import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { env } from "./env";
import { apiRequest } from "@/lib/api-client";

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
          const res = await apiRequest(`${backendUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password }),
            actionName: "NextAuth Authorize Credentials Login",
          });

          if (!res.ok) {
            return null;
          }

          const json = await res.json();
          // The backend wraps responses in { success: true, data: { accessToken, user } }
          const authData = json.data;

          if (!authData?.user) return null;

          // Attach the backend-issued JWT so we can forward it to protected backend routes
          // and WebSocket connections. The token is stored server-side in the NextAuth JWT.
          return {
            ...authData.user,
            accessToken: authData.accessToken ?? null,
          };
        } catch (err) {
          console.error("Backend login request failed:", err);
          return null;
        }
      },
    }),
  ],
});

