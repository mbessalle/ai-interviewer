import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/call(.*)",
  "/api/register-call(.*)",
  "/api/get-call(.*)",
  "/api/generate-interview-questions(.*)",
  "/api/analyze-communication(.*)",
  // Browser-side trace events from the candidate page, which has no sign-in.
  "/api/client-event(.*)",
  // Called by Retell, not by a signed-in user; the route checks Retell's signature itself.
  "/api/response-webhook(.*)",
]);

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/interviews(.*)",
]);

export default clerkMiddleware(
  (auth, req) => {
    const pathname = req.nextUrl.pathname;

    console.log(`[MIDDLEWARE] ==========================================`);
    console.log(`[MIDDLEWARE] Request: ${pathname}`);
    console.log(`[MIDDLEWARE] Is public route: ${isPublicRoute(req)}`);

    // Skip ALL Clerk processing for public routes (like /call/* for interviews)
    if (isPublicRoute(req)) {
      console.log(
        `[MIDDLEWARE] Public route - allowing access without auth: ${pathname}`,
      );

      return; // Exit early, don't touch Clerk at all
    }

    // Only process authentication for protected routes
    console.log(
      `[MIDDLEWARE] Protected route - applying authentication: ${pathname}`,
    );
    // A signed-out visitor goes to sign-in and comes back afterwards. auth().protect() alone answers
    // them with a 404, so the live link in the README showed "page not found" to every visitor.
    const { userId, redirectToSignIn } = auth();
    if (!userId) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Not signed in" }, { status: 401 });
      }
      console.log(
        `[MIDDLEWARE] Signed out - redirecting to sign-in: ${pathname}`,
      );

      return redirectToSignIn({ returnBackUrl: req.url });
    }
    console.log(`[MIDDLEWARE] Authentication successful: ${pathname}`);
    // The app's own sign-in page, not Clerk's hosted one.
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
