import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/call(.*)",
  "/api/register-call(.*)",
  "/api/get-call(.*)",
  "/api/generate-interview-questions(.*)",
  "/api/create-interviewer(.*)",
  "/api/analyze-communication(.*)",
]);

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/interviews(.*)",
]);

export default clerkMiddleware((auth, req) => {
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
  try {
    auth().protect();
    console.log(`[MIDDLEWARE] Authentication successful: ${pathname}`);
  } catch (error) {
    console.error(`[MIDDLEWARE] Authentication failed for ${pathname}:`, error);
    throw error;
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
