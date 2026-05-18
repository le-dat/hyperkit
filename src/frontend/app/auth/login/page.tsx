/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LOGO_PATH,
  PATH,
  PATH_LOGIN_SUCCESS,
  REDIRECT_PARAM,
} from "@/lib/constants";
import {
  LoginData,
  LoginField,
  loginSchema,
  ValidationErrors,
} from "@/lib/validate/login";
import { validateAllFields, validateField } from "@/lib/validate/utils";
import { useSignIn } from "@clerk/nextjs";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Loader2,
  Mail,
  Shield,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import Image from "next/image";

const LoginPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const redirectTo = searchParams.get(REDIRECT_PARAM) || PATH_LOGIN_SUCCESS;
  const [password, setPassword] = useState<string>("");
  const { isLoaded, signIn, setActive } = useSignIn();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPasswordAllowed, setIsPasswordAllowed] = useState(true);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<keyof LoginData>>(
    new Set(),
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    if (name === LoginField.PASSWORD) setPassword(value);
    const fieldName = name as keyof LoginData;
    if (touchedFields.has(fieldName))
      validateField(loginSchema, fieldName, value, setErrors);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const fieldName = e.target.name as keyof LoginData;
    setTouchedFields((prev) => new Set(prev).add(fieldName));
    validateField(loginSchema, fieldName, e.target.value, setErrors);
  }

  useEffect(() => {
    async function checkFirstFactors() {
      if (!isLoaded || !email) return;
      try {
        const attempt = await signIn.create({ identifier: email });
        const supportedFirstFactors: Array<{ strategy?: string }> =
          ((attempt as any)?.supportedFirstFactors as Array<{
            strategy?: string;
          }>) || [];
        const hasPassword = supportedFirstFactors.some(
          (f) => f?.strategy === "password",
        );
        const hasGoogleOAuth = supportedFirstFactors.some(
          (f) => f?.strategy === "oauth_google",
        );
        if (!hasPassword && hasGoogleOAuth) {
          setIsPasswordAllowed(false);
          setError(
            "This account was created using Google. Please continue with Google to log in.",
          );
        } else {
          setIsPasswordAllowed(true);
        }
      } catch {
        // ignore; user may not exist or other recoverable issue
      }
    }
    checkFirstFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, email]);

  const handleError = (err: unknown, failedMessage: string) => {
    const errorMessage =
      err && typeof err === "object" && "errors" in err
        ? (err as { errors?: { message?: string }[] }).errors?.[0]?.message
        : failedMessage;
    setError(errorMessage || failedMessage);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    if (!isPasswordAllowed) return;
    setTouchedFields(new Set([LoginField.EMAIL, LoginField.PASSWORD]));
    if (!validateAllFields(loginSchema, { email, password }, setErrors)) return;

    try {
      setIsLoading(true);
      setError("");
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({
          session: signInAttempt.createdSessionId,
        });
        router.replace(redirectTo);
        return;
      }
      handleError(null, "Login failed. Please check your password.");
    } catch (err: unknown) {
      handleError(err, "Password is incorrect. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Diagonal slash background element */}
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
      {/* Main content container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 md:px-8">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
          {/* Left side - Branding */}
          <div className="hidden md:block space-y-8 px-2">
            <div className="space-y-6">
              <div className="relative inline-block">
                <div className="absolute -inset-4 bg-hyper-accent/10 blur-2xl rounded-full" />
                <Image
                  src={LOGO_PATH}
                  alt="Hyperkit"
                  width={100}
                  height={100}
                  className="relative w-24 h-24"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-[2px] w-10 bg-hyper-accent" />
                  <span className="text-xs font-bold tracking-[0.3em] text-hyper-accent uppercase">
                    Secure Login
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold leading-[0.95] tracking-tight">
                  <span className="block text-white font-roslindale-display">
                    Welcome
                  </span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-hyper-accent to-orange-400 font-roslindale-display">
                    Back
                  </span>
                </h1>
                <p className="text-base text-gray-400 max-w-md leading-relaxed pt-4">
                  Enter your credentials to access your workspace and continue
                  building.
                </p>
              </div>
            </div>
            {/* Feature blocks */}
            <div className="space-y-3 pt-6">
              {[
                {
                  label: "Zero-Knowledge Auth",
                  detail: "Your data stays private",
                },
                {
                  label: "Session Management",
                  detail: "Auto-logout protection",
                },
                { label: "2FA Ready", detail: "Extra security layer" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="group relative border-l-4 border-hyper-accent/30 hover:border-hyper-accent transition-all duration-300 pl-4 py-2"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-white">
                      {item.label}
                    </span>
                    <span className="text-xs text-gray-500">{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Login form */}
          <div className="relative w-full max-w-md mx-auto md:mx-0">
            {/* Corners */}
            <div className="absolute -top-2 -left-2 w-14 h-14 border-t-4 border-l-4 border-hyper-accent/40" />
            <div className="absolute -bottom-2 -right-2 w-14 h-14 border-b-4 border-r-4 border-hyper-accent/40" />
            <div className="relative bg-hyper-950 border-4 border-hyper-800/50 p-6 md:p-10">
              {/* Back button */}
              <button
                onClick={() => router.back()}
                disabled={isLoading}
                className="group mb-5 inline-flex items-center gap-2 text-gray-400 hover:text-hyper-accent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
                <span className="text-xs font-bold tracking-widest uppercase">
                  Back
                </span>
              </button>
              {/* Mobile logo */}
              <div className="md:hidden mb-7 flex flex-col items-center gap-3">
                <Image
                  src={LOGO_PATH}
                  alt="Hyperkit"
                  width={64}
                  height={64}
                  className="w-16 h-16"
                />
                <h2 className="text-2xl font-bold text-white font-roslindale-display tracking-tight text-center">
                  Sign In
                </h2>
              </div>
              {/* Desktop header */}
              <div className="hidden md:block mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-hyper-accent" />
                  <span className="text-xs font-bold tracking-widest text-hyper-accent uppercase">
                    Login
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white font-roslindale-display tracking-tight">
                  Enter Password
                </h2>
                <p className="text-gray-400 text-sm mt-2">
                  Authenticate your account
                </p>
              </div>
              {/* Login form */}
              <form
                onSubmit={handleSubmit}
                className="space-y-6"
                autoComplete="on"
              >
                {/* Email field */}
                <div className="space-y-3">
                  <Label
                    htmlFor={LoginField.EMAIL}
                    className="text-xs font-bold tracking-widest text-gray-400 uppercase flex items-center gap-2"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Input
                      id={LoginField.EMAIL}
                      name={LoginField.EMAIL}
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled
                      placeholder="your@email.com"
                      className={`h-12 bg-black border-2 text-white placeholder:text-gray-600 font-medium transition-all duration-200 ${
                        errors.email
                          ? "border-red-500 focus:border-red-500"
                          : "border-hyper-700/50 focus:border-hyper-700/50"
                      } focus:ring-0 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-400 font-medium">
                      {errors.email}
                    </p>
                  )}
                </div>
                {/* Password field */}
                <div className="space-y-3">
                  <Label
                    htmlFor={LoginField.PASSWORD}
                    className="text-xs font-bold tracking-widest text-gray-400 uppercase flex items-center gap-2"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Password
                  </Label>
                  <div className="relative group">
                    <Input
                      id={LoginField.PASSWORD}
                      name={LoginField.PASSWORD}
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Enter your password"
                      className={`h-12 bg-black border-2 text-white placeholder:text-gray-600 font-medium transition-all duration-200 ${
                        errors.password
                          ? "border-red-500 focus:border-red-500"
                          : "border-hyper-700 focus:border-hyper-accent"
                      } focus:ring-0 focus:ring-offset-0 group-hover:border-hyper-700/80`}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-400 font-medium">
                      {errors.password}
                    </p>
                  )}
                </div>
                {/* Error message */}
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
                {/* Submit button */}
                <Button
                  variant="gradient"
                  size="lg"
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !isPasswordAllowed}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>SIGNING IN</span>
                      </>
                    ) : (
                      <>
                        <span>SIGN IN</span>
                        <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                </Button>
              </form>
              {/* Footer */}
              <div className="mt-8 pt-6 border-t-2 border-hyper-800">
                <div className="flex items-center justify-center gap-2 text-gray-600">
                  <Shield className="w-3 h-3" />
                  <p className="text-[10px] font-bold tracking-widest uppercase">
                    Enterprise Security
                  </p>
                </div>
              </div>
            </div>
            {/* Accent decoration for larger screens */}
            <div className="absolute top-1/2 -right-6 w-10 h-1 bg-hyper-accent hidden md:block" />
          </div>
        </div>
      </div>
      {/* Bottom brand strip */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-hyper-accent to-transparent" />
    </div>
  );
};

export default LoginPage;
