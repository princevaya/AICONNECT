"use client";

import * as React from "react";
import { useSignUp } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icons } from "@/components/global/icons";
import { AlertCircle, Loader2, Mail, Lock, User, Github, CheckCircle2 } from "lucide-react";

function getClerkErrorMessage(err: unknown, fallback: string): string {
    const clerkErr = err as { errors?: Array<{ longMessage?: string; message?: string }> } | null;
    return clerkErr?.errors?.[0]?.longMessage || clerkErr?.errors?.[0]?.message || fallback;
}

export default function CustomSignUp() {
    const { isLoaded, signUp, setActive } = useSignUp();
    const [emailAddress, setEmailAddress] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [firstName, setFirstName] = React.useState("");
    const [lastName, setLastName] = React.useState("");
    const [username, setUsername] = React.useState("");
    const [legalAccepted, setLegalAccepted] = React.useState(false);
    const [pendingVerification, setPendingVerification] = React.useState(false);
    const [code, setCode] = React.useState("");
    const [error, setError] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get("redirect_url") || "/dashboard";

    const isContinueOAuthSignUp = Boolean(
        isLoaded &&
        !pendingVerification &&
        signUp?.status === "missing_requirements" &&
        (pathname?.includes("/continue") ||
            signUp?.verifications?.externalAccount?.status === "verified")
    );

    const missingFields = React.useMemo(
        () => new Set(signUp?.missingFields ?? []),
        [signUp?.missingFields]
    );

    React.useEffect(() => {
        if (!isContinueOAuthSignUp || !signUp) return;
        if (signUp.firstName && !firstName) setFirstName(signUp.firstName);
        if (signUp.lastName && !lastName) setLastName(signUp.lastName);
        if (signUp.emailAddress && !emailAddress) setEmailAddress(signUp.emailAddress);
        if (signUp.username && !username) setUsername(signUp.username);
    }, [isContinueOAuthSignUp, signUp, firstName, lastName, emailAddress, username]);

    const handleContinueSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded || !signUp) return;

        setIsLoading(true);
        setError("");

        try {
            const payload: Record<string, unknown> = {};
            if (missingFields.has("first_name")) payload.firstName = firstName.trim();
            if (missingFields.has("last_name")) payload.lastName = lastName.trim();
            if (missingFields.has("username")) payload.username = username.trim();
            if (missingFields.has("email_address")) payload.emailAddress = emailAddress.trim();
            if (missingFields.has("password")) payload.password = password;
            if (missingFields.has("legal_accepted")) payload.legalAccepted = legalAccepted;

            const updated =
                Object.keys(payload).length > 0
                    ? await signUp.update(payload as Parameters<typeof signUp.update>[0])
                    : signUp;

            if (updated.status === "complete") {
                await setActive({ session: updated.createdSessionId });
                router.push(redirectUrl);
                return;
            }

            if (updated.unverifiedFields.includes("email_address")) {
                await updated.prepareEmailAddressVerification({ strategy: "email_code" });
                setPendingVerification(true);
                return;
            }

            setError("Please fill in all required fields to finish creating your account.");
        } catch (err: unknown) {
            setError(getClerkErrorMessage(err, "Could not complete registration"));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isLoaded) return;

        setIsLoading(true);
        setError("");

        try {
            await signUp.create({
                emailAddress,
                password,
                firstName,
                lastName,
            });

            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            setPendingVerification(true);
        } catch (err: unknown) {
            setError(getClerkErrorMessage(err, "Registration failed"));
        } finally {
            setIsLoading(false);
        }
    };

    const onPressVerify = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isLoaded) return;

        setIsLoading(true);
        setError("");

        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code,
            });

            if (completeSignUp.status === "complete") {
                await setActive({ session: completeSignUp.createdSessionId });
                router.push(redirectUrl);
            } else {
                setError("Verification failed. Please try again.");
            }
        } catch (err: unknown) {
            setError(getClerkErrorMessage(err, "Invalid verification code"));
        } finally {
            setIsLoading(false);
        }
    };

    const signUpWith = async (strategy: "oauth_google" | "oauth_github") => {
        if (!isLoaded) return;

        setIsLoading(true);
        setError("");

        const ssoCallbackUrl =
            redirectUrl !== "/dashboard"
                ? `/auth/sso-callback?redirect_url=${encodeURIComponent(redirectUrl)}`
                : "/auth/sso-callback";

        try {
            await signUp.authenticateWithRedirect({
                strategy,
                redirectUrl: ssoCallbackUrl,
                redirectUrlComplete: redirectUrl,
            });
        } catch (err: unknown) {
            setError(getClerkErrorMessage(err, "OAuth sign-up failed"));
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background gradients */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-300 dark:bg-blue-900/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-70 animate-blob" />
                <div className="absolute top-0 -right-4 w-72 h-72 bg-green-300 dark:bg-green-900/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-70 animate-blob animation-delay-2000" />
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-300 dark:bg-indigo-900/20 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-70 animate-blob animation-delay-4000" />
            </div>

            <Card className="w-full max-w-md shadow-2xl border-border/50 backdrop-blur-sm bg-background/95">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-full bg-primary/10 dark:bg-primary/20">
                            <Icons.logo className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        {pendingVerification
                            ? "Verify your email"
                            : isContinueOAuthSignUp
                                ? "Complete your account"
                                : "Create an account"}
                    </CardTitle>
                    <CardDescription>
                        {pendingVerification
                            ? "Enter the verification code sent to your email"
                            : isContinueOAuthSignUp
                                ? "Provide the remaining details to finish signing up"
                                : "Get started with AIConnect today"}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {isContinueOAuthSignUp ? (
                        <form onSubmit={handleContinueSignUp} className="space-y-4">
                            {(missingFields.has("first_name") || missingFields.has("last_name")) && (
                                <div className="grid grid-cols-2 gap-3">
                                    {missingFields.has("first_name") && (
                                        <div className="space-y-2">
                                            <Label htmlFor="continueFirstName">First name</Label>
                                            <Input
                                                id="continueFirstName"
                                                type="text"
                                                placeholder="John"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                disabled={isLoading}
                                                required
                                            />
                                        </div>
                                    )}
                                    {missingFields.has("last_name") && (
                                        <div className="space-y-2">
                                            <Label htmlFor="continueLastName">Last name</Label>
                                            <Input
                                                id="continueLastName"
                                                type="text"
                                                placeholder="Doe"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                disabled={isLoading}
                                                required
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {missingFields.has("username") && (
                                <div className="space-y-2">
                                    <Label htmlFor="continueUsername">Username</Label>
                                    <Input
                                        id="continueUsername"
                                        type="text"
                                        placeholder="Choose a username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                            )}

                            {missingFields.has("email_address") && (
                                <div className="space-y-2">
                                    <Label htmlFor="continueEmail">Email</Label>
                                    <Input
                                        id="continueEmail"
                                        type="email"
                                        placeholder="name@example.com"
                                        value={emailAddress}
                                        onChange={(e) => setEmailAddress(e.target.value)}
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                            )}

                            {missingFields.has("password") && (
                                <div className="space-y-2">
                                    <Label htmlFor="continuePassword">Password</Label>
                                    <Input
                                        id="continuePassword"
                                        type="password"
                                        placeholder="Create a strong password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                        required
                                    />
                                </div>
                            )}

                            {missingFields.has("legal_accepted") && (
                                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={legalAccepted}
                                        onChange={(e) => setLegalAccepted(e.target.checked)}
                                        disabled={isLoading}
                                        required
                                    />
                                    <span>I accept the Terms of Service and Privacy Policy</span>
                                </label>
                            )}

                            <div id="clerk-captcha" />

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Completing sign up...
                                    </>
                                ) : (
                                    "Continue"
                                )}
                            </Button>
                        </form>
                    ) : !pendingVerification ? (
                        <>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="firstName"
                                                type="text"
                                                placeholder="John"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                disabled={isLoading}
                                                required
                                                className="pl-9"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last name</Label>
                                        <Input
                                            id="lastName"
                                            type="text"
                                            placeholder="Doe"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            disabled={isLoading}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="name@example.com"
                                            value={emailAddress}
                                            onChange={(e) => setEmailAddress(e.target.value)}
                                            disabled={isLoading}
                                            required
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="Create a strong password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={isLoading}
                                            required
                                            className="pl-9"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Must be at least 8 characters
                                    </p>
                                </div>

                                <div id="clerk-captcha" />

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating account...
                                        </>
                                    ) : (
                                        "Create account"
                                    )}
                                </Button>
                            </form>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        Or continue with
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => signUpWith("oauth_google")}
                                    disabled={isLoading}
                                >
                                    <Icons.google className="h-4 w-4" />
                                    Google
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => signUpWith("oauth_github")}
                                    disabled={isLoading}
                                >
                                    <Github className="h-4 w-4" />
                                    GitHub
                                </Button>
                            </div>

                            <div className="text-center text-sm">
                                Already have an account?{" "}
                                <Link
                                    href={redirectUrl !== "/dashboard" ? `/auth/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}` : "/auth/sign-in"}
                                    className="font-semibold text-primary hover:underline"
                                >
                                    Sign in
                                </Link>
                            </div>
                        </>
                    ) : (
                        <form onSubmit={onPressVerify} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">Verification Code</Label>
                                <div className="relative">
                                    <CheckCircle2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="code"
                                        type="text"
                                        placeholder="Enter 6-digit code"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        disabled={isLoading}
                                        required
                                        maxLength={6}
                                        className="pl-9 text-center tracking-widest"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Check your email for the verification code
                                </p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify email"
                                )}
                            </Button>

                            <div className="text-center text-sm">
                                Didn&apos;t receive the code?{" "}
                                <button
                                    type="button"
                                    onClick={() => signUp?.prepareEmailAddressVerification({ strategy: "email_code" })}
                                    className="font-semibold text-primary hover:underline"
                                    disabled={isLoading}
                                >
                                    Resend
                                </button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
