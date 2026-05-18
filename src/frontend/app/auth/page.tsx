/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { FacebookIcon, GoogleIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PATH, PATH_LOGIN_SUCCESS, REDIRECT_PARAM } from "@/lib/constants";
import { safeRedirect } from "@/lib/redirectUtils";
import { useSignIn, useUser } from "@clerk/nextjs";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Loading from "../loading";
import { LOGO_PATH } from "@/lib/constants";
import Image from "next/image";
interface UserCheckResult {
  userExists: boolean;
  message: string;
  requireGoogle?: boolean;
}

const AuthPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get(REDIRECT_PARAM) || PATH_LOGIN_SUCCESS;
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();
  const { user } = useUser();
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const checkEmailExists = async (email: string): Promise<UserCheckResult> => {
    try {
      if (!signIn) {
        throw new Error("SignIn not available");
      }

      const signInAttempt = await signIn.create({
        identifier: email,
      });

      // If userData exists, the user already exists
      if ((signInAttempt as any)?.userData) {
        const supportedFirstFactors: Array<{ strategy?: string }> =
          ((signInAttempt as any)?.supportedFirstFactors as Array<{
            strategy?: string;
          }>) || [];

        const hasPassword = supportedFirstFactors.some(
          (f) => f?.strategy === "password",
        );
        const hasGoogleOAuth = supportedFirstFactors.some(
          (f) => f?.strategy === "oauth_google",
        );

        if (!hasPassword && hasGoogleOAuth) {
          return {
            userExists: true,
            requireGoogle: true,
            message:
              "This account was created using Google. Please continue with Google to log in.",
          };
        }

        return {
          userExists: true,
          message: "Email already exists. Please enter your password to login.",
        };
      }

      return {
        userExists: false,
        message: "Email not found. You will need to create an account.",
      };
    } catch (err: unknown) {
      console.error("Error checking email:", err);

      // Check the error type to determine if the user exists
      if (err && typeof err === "object" && "errors" in err) {
        const errorObj = err as {
          errors?: { code?: string; message?: string }[];
        };
        const errorCode = errorObj.errors?.[0]?.code;

        // If the error code is "form_identifier_not_found", the user does not exist
        if (errorCode === "form_identifier_not_found") {
          return {
            userExists: false,
            message: "Email not found. You will need to create an account.",
          };
        }
      }

      return {
        userExists: false,
        message: "Cannot check email. Please try again.",
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded || !email.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await checkEmailExists(email.trim());
      if (result.requireGoogle) {
        setError(result.message);
        return;
      }

      if (result.userExists) {
        router.push(
          `${PATH.login}?email=${encodeURIComponent(email)}&${REDIRECT_PARAM}=${encodeURIComponent(
            redirectTo,
          )}`,
        );
      } else {
        router.push(
          `${PATH.register}?email=${encodeURIComponent(
            email,
          )}&${REDIRECT_PARAM}=${encodeURIComponent(redirectTo)}`,
        );
      }
    } catch (err: unknown) {
      console.error("Submit error:", err);
      setError("An error occurred during sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (
    strategy: "oauth_google" | "oauth_facebook" | "oauth_twitter",
  ) => {
    if (!isSignInLoaded) return;

    setIsLoading(true);

    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: `${PATH.ssoCallback}?redirect=${encodeURIComponent(PATH_LOGIN_SUCCESS)}`,
        redirectUrlComplete: PATH_LOGIN_SUCCESS,
        continueSignUp: true,
        continueSignIn: true,
      });
    } catch (err: unknown) {
      console.error("OAuth sign in error:", err);
      const defaultErrorMessage = "An error occurred during sign in";
      const errorMessage =
        err && typeof err === "object" && "errors" in err
          ? (err as { errors?: { message?: string }[] }).errors?.[0]?.message
          : defaultErrorMessage;
      setError(errorMessage || defaultErrorMessage);
      setIsLoading(false);
    }
  };
  if (user) {
    safeRedirect(redirectTo);
    return;
  }
  if (!isSignInLoaded) return <Loading />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Diagonal slash background element - signature brutalist element */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-1/4 -right-1/4 w-[140%] h-[140%] bg-gradient-to-br from-hyper-accent/8 via-hyper-accent/4 to-transparent"
          style={{ transform: "rotate(-15deg)" }}
        />
        <div
          className="absolute -bottom-1/4 -left-1/4 w-[120%] h-[120%] bg-gradient-to-tr from-hyper-950 via-hyper-900/50 to-transparent"
          style={{ transform: "rotate(-15deg)" }}
        />
      </div>

      {/* Sharp grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 62, 0, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 62, 0, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content container - asymmetric layout */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left side - Editorial branding */}
          <div className="hidden lg:block space-y-8 px-8">
            {/* Logo with editorial treatment */}
            <div className="space-y-6">
              <div className="relative inline-block">
                <div className="absolute -inset-4 bg-hyper-accent/10 blur-2xl rounded-full" />
                <Image
                  src={LOGO_PATH}
                  alt="Hyperkit"
                  width={120}
                  height={120}
                  className="relative w-28 h-28"
                />
              </div>

              {/* Magazine-style typography */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-[2px] w-12 bg-hyper-accent" />
                  <span className="text-xs font-bold tracking-[0.3em] text-hyper-accent uppercase">
                    Auth Platform
                  </span>
                </div>
                <h1 className="text-6xl xl:text-7xl font-bold leading-[0.95] tracking-tight">
                  <span className="block text-white font-roslindale-display">
                    Enter The
                  </span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-hyper-accent to-orange-400 font-roslindale-display">
                    Hyperverse
                  </span>
                </h1>
                <p className="text-lg text-gray-400 max-w-md leading-relaxed pt-4">
                  One account. Infinite possibilities. Join thousands of
                  builders shaping the future.
                </p>
              </div>
            </div>

            {/* Brutalist feature blocks */}
            <div className="space-y-3 pt-8">
              {[
                { label: "Instant Access", detail: "Get started in seconds" },
                {
                  label: "Secure by Default",
                  detail: "Enterprise-grade protection",
                },
                {
                  label: "Always Available",
                  detail: "99.9% uptime guaranteed",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="group relative border-l-4 border-hyper-accent/30 hover:border-hyper-accent transition-all duration-300 pl-4 py-2"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm font-bold text-white">
                      {item.label}
                    </span>
                    <span className="text-xs text-gray-500">{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Auth form with sharp brutalist design */}
          <div className="relative w-full max-w-md mx-auto lg:mx-0">
            {/* Decorative corner elements */}
            <div className="absolute -top-2 -left-2 w-20 h-20 border-t-4 border-l-4 border-hyper-accent/40" />
            <div className="absolute -bottom-2 -right-2 w-20 h-20 border-b-4 border-r-4 border-hyper-accent/40" />

            {/* Form card */}
            <div className="relative bg-hyper-950 border-4 border-hyper-800/50 p-8 sm:p-10">
              {/* Mobile logo */}
              <div className="lg:hidden mb-8 flex flex-col items-center gap-4">
                <Image
                  src={LOGO_PATH}
                  alt="Hyperkit"
                  width={80}
                  height={80}
                  className="w-20 h-20"
                />
                <h2 className="text-3xl font-bold text-white font-roslindale-display tracking-tight text-center">
                  Welcome Back
                </h2>
              </div>

              {/* Desktop header */}
              <div className="hidden lg:block mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-hyper-accent" />
                  <span className="text-xs font-bold tracking-widest text-hyper-accent uppercase">
                    Authentication
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-white font-roslindale-display tracking-tight">
                  Sign In
                </h2>
              </div>

              {/* OAuth buttons - brutalist style */}
              <div className="space-y-3 mb-8">
                <Button
                  type="button"
                  variant="outline"
                  className="group relative w-full h-14 bg-black border-2 border-hyper-700 text-white hover:bg-hyper-accent hover:border-hyper-accent hover:text-black font-bold transition-all duration-200 overflow-hidden"
                  onClick={() => handleOAuthSignIn("oauth_google")}
                  disabled={isLoading}
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <span className="relative flex items-center">
                      <GoogleIcon
                        className="w-5 h-5"
                        style={{
                          filter:
                            "drop-shadow(0 0 4px rgba(0,0,0,0.45)) drop-shadow(0 0 4px rgba(0,0,0,0.18))",
                        }}
                      />
                      <span className="absolute inset-0 rounded-full z-[-1] opacity-0 group-hover:opacity-80 bg-white transition-opacity duration-200 pointer-events-none" />
                    </span>
                    <span className="tracking-wide">Google</span>
                  </span>
                  <div className="absolute inset-0 bg-hyper-accent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-14 bg-black border-2 border-hyper-700/50 text-gray-500 cursor-not-allowed font-bold"
                    disabled
                  >
                    <XIcon className="w-8 h-8" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-14 bg-black border-2 border-hyper-700/50 text-gray-500 cursor-not-allowed font-bold"
                    disabled
                  >
                    <FacebookIcon className="w-8 h-8" />
                  </Button>
                </div>
              </div>

              {/* Sharp divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-hyper-800" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-hyper-950 text-xs font-bold tracking-widest text-gray-500 uppercase">
                    Or Email
                  </span>
                </div>
              </div>

              {/* Email form - brutalist inputs */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="email"
                    className="text-xs font-bold tracking-widest text-gray-400 uppercase flex items-center gap-2"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="h-14 bg-black border-2 border-hyper-700 text-white placeholder:text-gray-600 font-medium transition-all duration-200 focus:border-hyper-accent focus:ring-0 focus:ring-offset-0 group-hover:border-hyper-700/80"
                    />
                  </div>
                </div>

                {/* Error message - brutalist alert */}
                {error && (
                  <div className="relative border-l-4 border-red-500 bg-red-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <div className="w-2 h-2 bg-red-500" />
                      </div>
                      <p className="text-sm text-red-400 font-medium leading-relaxed">
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit button - bold brutalist CTA */}
                <Button
                  variant="gradient"
                  size="lg"
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>PROCESSING</span>
                      </>
                    ) : (
                      <>
                        <span>CONTINUE</span>
                        <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                </Button>
              </form>

              {/* Footer - minimal */}
              <div className="mt-8 pt-6 border-t-2 border-hyper-800">
                <p className="text-[10px] font-bold tracking-widest text-gray-600 text-center uppercase">
                  Protected by Enterprise Security
                </p>
              </div>
            </div>

            {/* Sharp accent decoration */}
            <div className="absolute top-1/2 -right-6 w-12 h-1 bg-hyper-accent hidden xl:block" />
          </div>
        </div>
      </div>

      {/* Bottom brand strip */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-hyper-accent to-transparent" />
    </div>
  );
};

export default AuthPage;
