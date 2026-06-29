/**
 * Fetches the backend JWT access token from the secure server route.
 * Used by client-side code to authenticate WebSocket connections.
 *
 * Returns null when the user is not authenticated (guest user) or when
 * the token fetch fails.
 */
export async function getWsAccessToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/token");
    if (!res.ok) return null;
    const data = await res.json();
    return data.accessToken ?? null;
  } catch {
    return null;
  }
}
