export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    /*
     * Run on all routes except:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico, apple-icon.png, icon.png
     * - /api/auth/** (NextAuth routes – must NOT be intercepted)
     */
    "/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon.png|api/auth).*)",
  ],
};
