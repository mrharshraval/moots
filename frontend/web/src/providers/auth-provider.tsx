"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { env } from "@/env"

function decodeJwt(token: string) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch (e) {
    return null;
  }
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated"

export interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  username?: string | null
  bio?: string | null
  createdAt?: string | null
  actorId?: string | null
}

export interface Session {
  user: User
  accessToken: string
}

interface AuthContextValue {
  session: Session | null
  status: AuthStatus
  update: (data?: unknown) => Promise<Session | null>
  signIn: (type: "guest" | "credentials", credentials?: Record<string, unknown>) => Promise<void>
  signOut: (options?: { redirect?: boolean }) => Promise<void>
}

// We attach a global function so that the api-client can trigger a token refresh
// outside of React context.
let globalRefreshSession: (() => Promise<Session | null>) | null = null;
let currentAccessToken: string | null = null;

export const getAccessToken = () => currentAccessToken;
export const triggerRefresh = async () => {
  if (globalRefreshSession) return globalRefreshSession();
  return null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [refreshPromise, setRefreshPromise] = useState<Promise<Session | null> | null>(null)

  const performRefresh = async () => {
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
        method: "POST",
        credentials: "include", // Essential for moots_session HttpOnly cookie
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": crypto.randomUUID(),
        }
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          const payload = decodeJwt(json.data.accessToken);
          const actorId = payload?.actorId || payload?.sub || "guest";

          let user = {
             id: actorId,
             name: "Guest",
          } as User

          try {
            // Fetch profile to get real identity
            const profileRes = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/user/me`, {
              headers: {
                "Authorization": `Bearer ${json.data.accessToken}`
              }
            })
            if (profileRes.ok) {
              const profileJson = await profileRes.json()
              if (profileJson.success && profileJson.data) {
                user = {
                  id: profileJson.data.id,
                  name: profileJson.data.nickname || profileJson.data.username || "User",
                  username: profileJson.data.username,
                  bio: profileJson.data.bio,
                  email: profileJson.data.email,
                  createdAt: profileJson.data.createdAt,
                }
              }
            }
          } catch (e) {
            // Ignored, fallback to guest
          }

          const newSession = {
            accessToken: json.data.accessToken,
            user,
          }
          currentAccessToken = newSession.accessToken;
          setSession(newSession)
          setStatus("authenticated")
          return newSession
        }
      }
    } catch (e) {
      console.error("Failed to refresh session", e)
    }
    currentAccessToken = null;
    setSession(null)
    setStatus("unauthenticated")
    return null
  }

  const refreshSession = async () => {
    if (refreshPromise) return refreshPromise
    const promise = performRefresh()
    setRefreshPromise(promise)
    promise.finally(() => setRefreshPromise(null))
    return promise
  }

  useEffect(() => {
    globalRefreshSession = refreshSession;

    // On mount, attempt to restore an existing session via cookie.
    // If no session exists (truly first visit), automatically create a guest session
    // so the user can start chatting immediately — no signup required.
    performRefresh().then((existingSession) => {
      if (!existingSession) {
        // No existing session — silently create a guest session
        fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/guest`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-Request-ID": crypto.randomUUID(),
          },
        })
          .then((res) => {
            if (res.ok) {
              // Guest session cookie is now set; refresh to load the access token
              return performRefresh();
            }
          })
          .catch((e) => {
            console.error("Auto guest login failed", e);
          });
      }
    });

    return () => { globalRefreshSession = null; }
  }, [])

  const signIn = async (type: "guest" | "credentials", credentials?: Record<string, unknown>) => {
    setStatus("loading")
    try {
      const endpoint = type === "guest" ? "/api/auth/guest" : "/api/auth/login"
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${endpoint}`, {
        method: "POST",
        credentials: "include", // Ensures the response cookie is saved in the browser
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": crypto.randomUUID(),
        },
        body: credentials ? JSON.stringify(credentials) : undefined
      })

      if (res.ok) {
        await refreshSession()
        if (typeof window !== "undefined") {
          window.location.href = "/" // Redirect home
        }
      } else {
        setStatus("unauthenticated")
        throw new Error("Sign in failed")
      }
    } catch (e) {
      setStatus("unauthenticated")
      throw e
    }
  }

  const signOut = async (options?: { redirect?: boolean }) => {
    setStatus("loading")
    try {
      await fetch(`${env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": crypto.randomUUID(),
        },
      }).catch(console.error);

      currentAccessToken = null;
      setSession(null)
      setStatus("unauthenticated")
      
      // Also clear Zustand stores if we are logging out
      // We can rely on the full page reload to clear memory, but if options.redirect is false, we should clear it
      
      if (options?.redirect !== false && typeof window !== "undefined") {
        window.location.href = "/login"
      }
    } catch (e) {
      setStatus("unauthenticated")
    }
  }

  const update = async (data?: unknown) => {
    return refreshSession()
  }

  return (
    <AuthContext.Provider value={{ session, status, update, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useSession() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useSession must be used within an AuthProvider")
  }
  return {
    data: context.session,
    status: context.status,
    update: context.update,
    signIn: context.signIn,
    signOut: context.signOut,
  }
}
