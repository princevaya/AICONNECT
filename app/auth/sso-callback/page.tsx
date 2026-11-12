"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AuthenticateWithRedirectCallback,
  useAuth,
  useSignUp,
} from "@clerk/nextjs";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function resolveSafeRedirectUrl(rawUrl: string | null): string {
  if (!rawUrl) return "/dashboard";
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }
  if (typeof window !== "undefined") {
    try {
      const parsed = new URL(trimmed);
      if (parsed.origin === window.location.origin) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}` || "/dashboard";
      }
    } catch {
      // Ignore malformed redirect URLs
    }
  }
  return "/dashboard";
}

function SSOCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();

  const fallbackRedirect = React.useMemo(
    () => resolveSafeRedirectUrl(searchParams.get("redirect_url")),
    [searchParams]
  );

  const continueSignUpUrl = React.useMemo(
    () =>
      fallbackRedirect !== "/dashboard"
        ? `/auth/sign-up/continue?redirect_url=${encodeURIComponent(fallbackRedirect)}`
        : "/auth/sign-up/continue",
    [fallbackRedirect]
  );

  const oauthError =
    searchParams.get("error_description") || searchParams.get("error");
  const [isTimedOut, setIsTimedOut] = React.useState(false);

  // If the session is already active, proceed directly instead of waiting on spinner.
  React.useEffect(() => {
    if (authLoaded && isSignedIn) {
      router.replace(fallbackRedirect);
    }
  }, [authLoaded, isSignedIn, fallbackRedirect, router]);

  // If Clerk transferred a new OAuth sign-in into an incomplete sign-up, forward to continue step.
  React.useEffect(() => {
    if (signUpLoaded && signUp?.status === "missing_requirements") {
      router.replace(continueSignUpUrl);
    }
  }, [signUpLoaded, signUp?.status, continueSignUpUrl, router]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsTimedOut(true);
    }, 12000);
    return () => window.clearTimeout(timer);
  }, []);

  if (oauthError) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-xl border bg-background p-6 text-center space-y-4 shadow-lg">
          <div className="flex justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Sign-in could not be completed</h1>
            <p className="text-sm text-muted-foreground">{oauthError}</p>
          </div>
          <div className="flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/auth/sign-in">Back to Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Sign Up</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Completing sign in...</p>
          <p className="text-xs text-muted-foreground">
            Please wait while we finish verifying your account.
          </p>
        </div>

        {/* Clerk processes the OAuth redirect callback and handles sign-in -> sign-up transfers */}
        <AuthenticateWithRedirectCallback
          signInUrl="/auth/sign-in"
          signUpUrl="/auth/sign-up"
          signInFallbackRedirectUrl={fallbackRedirect}
          signUpFallbackRedirectUrl={fallbackRedirect}
          continueSignUpUrl={continueSignUpUrl}
        />

        {/* Required by Clerk Bot Protection when transferring a new OAuth sign-in into sign-up */}
        <div id="clerk-captcha" className="flex justify-center" />

        {isTimedOut && (
          <div className="pt-3 border-t space-y-3">
            <p className="text-xs text-muted-foreground">
              Taking longer than expected. If you are signing in with a new account,
              complete sign-up or try again.
            </p>
            <div className="flex justify-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/auth/sign-in">Back to Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={continueSignUpUrl}>Continue Sign Up</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SSOCallback() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Completing sign in...</p>
          </div>
        </div>
      }
    >
      <SSOCallbackInner />
    </React.Suspense>
  );
}

