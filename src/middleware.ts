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
  const url = req.url;
  const pathname = req.nextUrl.pathname;
  
  console.log(`[MIDDLEWARE] ==========================================`);
  console.log(`[MIDDLEWARE] Request: ${pathname}`);
  console.log(`[MIDDLEWARE] Full URL: ${url}`);
  
  // Test individual patterns
  console.log(`[MIDDLEWARE] Pattern tests:`);
  console.log(`[MIDDLEWARE] - Matches /call(.*): ${pathname.match(/^\/call.*/)}`);
  console.log(`[MIDDLEWARE] - Matches /dashboard(.*): ${pathname.match(/^\/dashboard.*/)}`);
  console.log(`[MIDDLEWARE] - Matches /interviews(.*): ${pathname.match(/^\/interviews.*/)}`);
  
  console.log(`[MIDDLEWARE] Is public route: ${isPublicRoute(req)}`);
  console.log(`[MIDDLEWARE] Is protected route: ${isProtectedRoute(req)}`);
  
  try {
    const userId = auth().userId;
    console.log(`[MIDDLEWARE] User ID: ${userId || 'none'}`);

    if (!isPublicRoute(req)) {
      console.log(`[MIDDLEWARE] Protecting route: ${pathname}`);
      auth().protect();
    } else {
      console.log(`[MIDDLEWARE] Allowing public access: ${pathname}`);
    }

    if (!userId && isProtectedRoute(req)) {
      console.log(`[MIDDLEWARE] Redirecting to sign-in: ${pathname}`);
      
      return auth().redirectToSignIn();
    }
    
    console.log(`[MIDDLEWARE] Request completed successfully: ${pathname}`);
  } catch (error) {
    console.error(`[MIDDLEWARE] Error processing request: ${pathname}`, error);
    throw error;
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
