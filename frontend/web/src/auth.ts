import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { env } from "./env";

/**
 * NextAuth configuration with Credentials provider.
 *
 * auth.ts runs EXCLUSIVELY on the Next.js server (inside NextAuth internals).
 * Do NOT import browser-side utilities (apiRequest, tokenManager, etc.) here.
 * Use plain fetch() for all server-side HTTP calls.
 */
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

          // Use plain fetch — this runs server-side inside NextAuth.
          // apiRequest is a browser-side client and must not be imported here.
          const res = await fetch(`${backendUrl}/api/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              // Satisfy the API's CSRF header requirement for POST requests
              "X-Request-ID": crypto.randomUUID(),
            },
            body: JSON.stringify({ identifier, password }),
          });

          if (!res.ok) return null;

          const json = await res.json();
          // Backend wraps responses: { success: true, data: { accessToken, user } }
          const authData = json.data;
          if (!authData?.user || !authData?.accessToken) return null;

          // NOTE: The backend also sets Set-Cookie: moots_session on this response.
          // NextAuth's authorize() cannot propagate Set-Cookie headers to the browser.
          // The moots_session cookie IS set when the user visits /api/auth/token —
          // that route handles the cookie relay for guest provisioning and refresh.
          //
          // For registered users, we store the accessToken in the NextAuth JWT so
          // /api/auth/token can return it directly without a cookie roundtrip.

          return {
            ...authData.user,
            accessToken: authData.accessToken,
          };
        } catch (err) {
          console.error("Backend login request failed:", err);
          return null;
        }
      },
    }),
  ],
});