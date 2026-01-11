// app/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

// Define route matchers
const isProtectedRoute = createRouteMatcher(["/discover"]);
const isAuthRoute = createRouteMatcher(["/sign-up", "/sign-in"]);
const isOnboardingRoute = createRouteMatcher(["/onboarding"]);
const isLandingPageRoute = createRouteMatcher(["/"]); // Landing page

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, sessionClaims, redirectToSignIn } = await auth();
  const onboardingComplete = sessionClaims?.metadata?.onboardingComplete;

  // CASE 1: User not signed in trying to access protected routes
  if (!userId && isProtectedRoute(req)) {
    // First redirect to sign-up, then they'll go through onboarding before reaching /discover
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // CASE 2: User is signed in but hasn't completed onboarding trying to access protected routes
  if (userId && !onboardingComplete && isProtectedRoute(req)) {
    const onboardingUrl = new URL("/onboarding", req.url);
    return NextResponse.redirect(onboardingUrl);
  }

  // CASE 3: User is signed in and tries to access auth routes
  if (userId && isAuthRoute(req)) {
    // If onboarding not complete, redirect to onboarding
    if (!onboardingComplete) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    // If onboarding complete, redirect to discover
    return NextResponse.redirect(new URL("/discover", req.url));
  }

  // CASE 4: User with completed onboarding trying to access onboarding page
  if (userId && onboardingComplete && isOnboardingRoute(req)) {
    return NextResponse.redirect(new URL("/discover", req.url));
  }

  // CASE 5: Signed-in user visiting landing page
  if (userId && isLandingPageRoute(req)) {
    // If onboarding not complete, redirect to onboarding
    if (!onboardingComplete) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    // If onboarding complete, redirect to discover
    return NextResponse.redirect(new URL("/discover", req.url));
  }

  // Let the request continue for all other cases
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};





// import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
// import { NextResponse, NextRequest } from "next/server";

// const isProtectedRoute = createRouteMatcher(["/discover"]);
// const isAuthRoute = createRouteMatcher(["/sign-up", "/sign-in"]);
// const isOnboardingRoute = createRouteMatcher(["/onboarding"]);

// export default clerkMiddleware(async (auth, req) => {
//   const { userId, sessionClaims, redirectToSignIn } = await auth();

//   // If the user isn't signed in and the route is private, redirect to sign in
//   if (!userId && isProtectedRoute(req)) {
//     return redirectToSignIn({ returnBackUrl: "/discover" });
//   }

//   // If the user is logged in and tries to access auth routes (signup/signin),
//   // redirect them to discover page
//   if (userId && isAuthRoute(req)) {
//     return NextResponse.redirect(new URL("/discover", req.url));
//   }

//   // Let the request continue without trying to sync with Supabase here
//   return NextResponse.next();
// });

// export const config = {
//   matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
// };