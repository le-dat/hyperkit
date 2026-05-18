"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LOGO_PATH, PATH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useSignUp } from "@clerk/nextjs";
import { OTPInput, REGEXP_ONLY_DIGITS, SlotProps } from "input-otp";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import Image from "next/image";

const RESEND_COOLDOWN_SECONDS = 30;

function VerifyCodePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const redirectTo = searchParams.get("redirect") || PATH.root;
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [hasError, setHasError] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    RESEND_COOLDOWN_SECONDS,
  );
  const { isLoaded, signUp, setActive } = useSignUp();

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const intervalId = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [remainingSeconds]);

  function formatCountdown(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    if (verificationCode.length !== 6) {
      setHasError("Please enter the 6-digit code.");
      return;
    }
    setIsLoading(true);
    setHasError("");
    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });
      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        router.push(redirectTo);
        return;
      }
      setHasError("Passcode is incorrect. Please try again");
    } catch (err) {
      setHasError("An error occurred during verification.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (!isLoaded || !signUp) return;
    setIsResending(true);
    setHasError("");
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setRemainingSeconds(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setHasError("Failed to resend the code. Please try again.");
      console.error(err);
    } finally {
      setIsResending(false);
    }
  }

  function handleCodeChange(code: string) {
    setVerificationCode(code);
    if (hasError) setHasError("");
  }

  function Slot(props: SlotProps) {
    return (
      <div
        className={cn(
          "relative flex-1 px-2 py-4 h-[56px] bg-black border-4 flex items-center justify-center transition-all duration-200",
          props.isActive
            ? "border-hyper-accent"
            : hasError
              ? "border-red-500"
              : "border-hyper-700",
          "md:h-[72px]",
        )}
      >
        <div className="font-bold text-[28px] md:text-[32px] leading-[36px] md:leading-[40px] text-white">
          {props.char ?? props.placeholderChar}
        </div>
        {props.hasFakeCaret && <FakeCaret />}
      </div>
    );
  }

  function FakeCaret() {
    return (
      <div className="absolute pointer-events-none inset-0 flex items-center justify-center animate-caret-blink">
        <div className="w-1 h-8 md:h-10 bg-hyper-accent" />
      </div>
    );
  }

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
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulance type='fractalNoise' baseFrequency='2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 md:px-6">
        <div className="w-full max-w-full md:max-w-xl">
          {/* Decorative corner elements */}
          <div className="relative">
            <div className="absolute -top-4 -left-4 w-20 h-20 border-t-4 border-l-4 border-hyper-accent/40" />
            <div className="absolute -bottom-4 -right-4 w-20 h-20 border-b-4 border-r-4 border-hyper-accent/40" />

            {/* Card */}
            <div className="relative bg-hyper-950 border-4 border-hyper-800/50 p-4 md:p-12">
              {/* Back button */}
              <button
                onClick={() => router.back()}
                disabled={isLoading}
                className="group mb-8 inline-flex items-center gap-2 text-gray-400 hover:text-hyper-accent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
                <span className="text-xs font-bold tracking-widest uppercase">
                  Back
                </span>
              </button>

              {/* Logo and Header */}
              <div className="flex flex-col items-center text-center mb-8 md:mb-10">
                <div className="relative inline-block mb-6">
                  <div className="absolute -inset-3 bg-hyper-accent/10 blur-xl rounded-full" />
                  <Image
                    src={LOGO_PATH}
                    alt="Logo"
                    width={80}
                    height={80}
                    className="relative w-16 h-16 md:w-20 md:h-20"
                  />
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-hyper-accent" />
                  <span className="text-xs font-bold tracking-widest text-hyper-accent uppercase">
                    Email Verification
                  </span>
                </div>

                <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight text-white font-roslindale-display mb-4">
                  Verify Your Email
                </h1>

                {/* Email info box */}
                <div className="w-full p-4 bg-black border-2 border-hyper-700/30 mt-4 md:mt-6">
                  <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
                    <Mail className="w-4 h-4" />
                    <span className="text-xs font-bold tracking-widest uppercase">
                      Sent To
                    </span>
                  </div>
                  <p className="text-white font-bold text-sm">{email}</p>
                  <div className="flex items-center justify-center gap-2 mt-3 text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs">Valid for 20 minutes</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form
                className="space-y-6"
                onSubmit={handleSubmit}
                autoComplete="off"
              >
                {/* OTP Input */}
                <div className="space-y-4">
                  <Label
                    htmlFor="verificationCode"
                    className="text-xs font-bold tracking-widest text-gray-400 uppercase flex items-center gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Enter 6-Digit Code
                  </Label>
                  <OTPInput
                    maxLength={6}
                    value={verificationCode}
                    onChange={handleCodeChange}
                    pattern={REGEXP_ONLY_DIGITS}
                    containerClassName="group flex items-center gap-2 md:gap-3 has-[:disabled]:opacity-50 justify-center"
                    render={({ slots }) => (
                      <div className="flex items-center gap-2 md:gap-3 w-full justify-center">
                        {slots.map((slot, idx) => (
                          <Slot key={idx} {...slot} />
                        ))}
                      </div>
                    )}
                    disabled={isLoading}
                  />
                </div>

                {/* Error message */}
                {hasError && (
                  <div className="relative border-l-4 border-red-500 bg-red-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <div className="w-2 h-2 bg-red-500" />
                      </div>
                      <p className="text-sm text-red-400 font-medium leading-relaxed">
                        {hasError}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isLoading || verificationCode.length !== 6}
                  className="group relative w-full h-12 md:h-14 bg-hyper-accent hover:bg-orange-500 text-black font-bold text-base tracking-wide transition-all duration-200 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed border-0"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>VERIFYING</span>
                      </>
                    ) : (
                      <>
                        <span>VERIFY EMAIL</span>
                        <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-hyper-accent translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </Button>

                {/* Resend section */}
                <div className="pt-6 border-t-2 border-hyper-800">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between text-sm gap-2 md:gap-0">
                    <span className="text-gray-400">
                      Didn&apos;t receive the code?
                    </span>
                    <Button
                      variant="link"
                      className="text-hyper-accent hover:text-orange-400 font-bold text-xs tracking-wide uppercase p-0 h-auto disabled:opacity-50"
                      onClick={handleResend}
                      disabled={
                        isLoading || isResending || remainingSeconds > 0
                      }
                      type="button"
                    >
                      {isResending ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                          RESENDING
                        </>
                      ) : remainingSeconds > 0 ? (
                        `RESEND IN ${formatCountdown(remainingSeconds)}`
                      ) : (
                        "RESEND CODE"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom brand strip */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-hyper-accent to-transparent" />
    </div>
  );
}

export default VerifyCodePage;
