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
import { RegisterField, registerSchema } from "@/lib/validate/register";
import { validateAllFields, validateField } from "@/lib/validate/utils";
import { useSignUp } from "@clerk/nextjs";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Loader2,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState } from "react";
import Image from "next/image";

const RegisterPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const redirectTo = searchParams.get(REDIRECT_PARAM) || PATH_LOGIN_SUCCESS;
  const [password, setPassword] = useState<string>("");
  const { isLoaded, signUp } = useSignUp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
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
    setTouchedFields(new Set([RegisterField.PASSWORD]));
    if (!validateAllFields(registerSchema, { password }, setErrors)) return;

    try {
      setIsLoading(true);
      setError("");
      await signUp.create({
        emailAddress: email,
        password,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      router.push(
        `${PATH.verifyCode}?email=${email}&redirect=${encodeURIComponent(redirectTo)}`,
      );
    } catch (err: unknown) {
      handleError(err, "An error occurred during registration.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Bg elements */}
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
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 md:px-8">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Left Side: Branding - only on md+ */}
          <div className="hidden md:block space-y-8 px-2 md:px-8">
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
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-[2px] w-12 bg-hyper-accent" />
                  <span className="text-xs font-bold tracking-[0.3em] text-hyper-accent uppercase">
                    New Account
                  </span>
                </div>
                <h1 className="text-5xl md:text-6xl font-bold leading-[0.95] tracking-tight">
                  <span className="block text-white font-roslindale-display">
                    Join The
                  </span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-hyper-accent to-orange-400 font-roslindale-display">
                    Revolution
                  </span>
                </h1>
                <p className="text-base md:text-lg text-gray-400 max-w-md leading-relaxed pt-4">
                  Create a secure password to protect your account and start
                  your journey with us.
                </p>
              </div>
            </div>
            <div className="space-y-3 pt-8">
              {[
                {
                  label: "Password Encryption",
                  detail: "Military-grade security",
                },
                { label: "Account Protection", detail: "Multi-layer defense" },
                {
                  label: "Instant Verification",
                  detail: "Quick email confirmation",
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
          {/* Right Side: Register form - full width on mobile, half on md+ */}
          <div className="relative w-full max-w-md mx-auto md:mx-0">
            {/* Decorative corners */}
            <div className="absolute -top-2 -left-2 w-16 h-16 md:w-20 md:h-20 border-t-4 border-l-4 border-hyper-accent/40" />
            <div className="absolute -bottom-2 -right-2 w-16 h-16 md:w-20 md:h-20 border-b-4 border-r-4 border-hyper-accent/40" />

            <div className="relative bg-hyper-950 border-4 border-hyper-800/50 p-6 md:p-10">
              {/* Back Button */}
              <button
                onClick={() => router.back()}
                disabled={isLoading}
                className="group mb-6 inline-flex items-center gap-2 text-gray-400 hover:text-hyper-accent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
                <span className="text-xs font-bold tracking-widest uppercase">
                  Back
                </span>
              </button>
              {/* Branding Header: mobile only */}
              <div className="md:hidden mb-8 flex flex-col items-center gap-4">
                <Image
                  src={LOGO_PATH}
                  alt="Hyperkit"
                  width={64}
                  height={64}
                  className="w-16 h-16"
                />
                <h2 className="text-2xl font-bold text-white font-roslindale-display tracking-tight text-center">
                  Create Account
                </h2>
              </div>
              {/* Header: Desktop */}
              <div className="hidden md:block mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-hyper-accent" />
                  <span className="text-xs font-bold tracking-widest text-hyper-accent uppercase">
                    Registration
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white font-roslindale-display tracking-tight">
                  Create Password
                </h2>
                <p className="text-gray-400 text-xs md:text-sm mt-2">
                  Secure your account with a strong password
                </p>
              </div>
              {/* Email display */}
              <div className="mb-6 p-3 md:p-4 bg-black border-2 border-hyper-700/30 rounded">
                <div className="flex items-center gap-2 text-gray-400">
                  <UserPlus className="w-4 h-4" />
                  <span className="text-xs font-bold tracking-widest uppercase">
                    Registering
                  </span>
                </div>
                <p className="text-white font-medium mt-1 text-xs md:text-sm">
                  {email}
                </p>
              </div>
              {/* Register Form */}
              <form
                onSubmit={handleSubmit}
                className="space-y-6"
                autoComplete="on"
              >
                {/* Password Field */}
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
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="Create a strong password"
                      className={`h-12 md:h-14 bg-black border-2 text-white placeholder:text-gray-600 font-medium transition-all duration-200 ${
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
                {/* Password Requirements */}
                <div className="bg-hyper-900/50 border-l-4 border-hyper-accent/30 p-3 md:p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-4 h-4 mt-0.5 text-hyper-accent/70" />
                    <div className="text-xs text-gray-400 leading-relaxed">
                      <p className="font-bold text-gray-300 mb-1">
                        Password must contain:
                      </p>
                      <ul className="space-y-0.5">
                        <li>• At least 8 characters</li>
                        <li>• Mix of uppercase and lowercase</li>
                        <li>• At least one number</li>
                      </ul>
                    </div>
                  </div>
                </div>
                {/* Error message */}
                {error && (
                  <div className="relative border-l-4 border-red-500 bg-red-500/5 p-3 md:p-4">
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
                {/* Clerk Captcha */}
                <div
                  id="clerk-captcha"
                  data-cl-theme="dark"
                  className="flex items-center justify-center"
                />
                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full h-12 md:h-14 bg-hyper-accent hover:bg-orange-500 text-black font-bold text-base tracking-wide transition-all duration-200 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed border-0"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>CREATING ACCOUNT</span>
                      </>
                    ) : (
                      <>
                        <span>CREATE ACCOUNT</span>
                        <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-hyper-accent translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </Button>
              </form>
              {/* Footer */}
              <div className="mt-8 pt-6 border-t-2 border-hyper-800">
                <p className="text-[10px] font-bold tracking-widest text-gray-600 text-center uppercase">
                  Your password is encrypted and secure
                </p>
              </div>
            </div>
            {/* Sharp accent decoration: only on lg+ */}
            <div className="absolute top-1/2 -right-6 w-8 h-1 bg-hyper-accent hidden md:block" />
          </div>
        </div>
      </div>
      {/* Bottom brand strip */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-hyper-accent to-transparent" />
    </div>
  );
};

export default RegisterPage;
