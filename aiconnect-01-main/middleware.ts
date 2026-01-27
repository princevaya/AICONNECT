import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // protect all routes except static files
    "/((?!_next|.*\\..*).*)",
  ],
};
