import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        token.username = (user as any).username;
        token.bio = (user as any).bio;
        token.createdAt = (user as any).createdAt;
        // Store backend-issued JWT for forwarding to protected API/WS
        token.accessToken = (user as any).accessToken ?? token.accessToken;
      }
      if (trigger === "update" && session) {
        if (session.user) {
          token.username = session.user.username;
          token.name = session.user.name;
          token.bio = session.user.bio;
          token.image = session.user.image;
        } else {
          token.username = session.username;
          token.name = session.name;
          token.bio = session.bio;
          token.image = session.image;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.image as string;
        (session.user as any).username = token.username as string;
        (session.user as any).bio = token.bio as string;
        (session.user as any).createdAt = token.createdAt as string;
        // Surface backend accessToken on the session (used by client for WS auth)
        (session as any).accessToken = token.accessToken as string | null;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/signup") ||
        nextUrl.pathname.startsWith("/verify");

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      // Protect only specific social/account paths, leaving chat and main pages open
      const isProtected =
        nextUrl.pathname.startsWith("/friends") ||
        nextUrl.pathname.startsWith("/groups") ||
        nextUrl.pathname.startsWith("/notifications") ||
        nextUrl.pathname.startsWith("/settings");

      if (isProtected && !isLoggedIn) {
        return false; // NextAuth automatically redirects to /login
      }
      return true;
    },
  },
  providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;
