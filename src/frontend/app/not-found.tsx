"use client";

import Link from "next/link";
import { PATH } from "@/lib/constants";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="fixed inset-0 bg-hyper-950 flex items-center justify-center overflow-hidden">
      {/* Animated dots background */}
      <div className="absolute inset-0 dots-bg opacity-40" />

      {/* Floating gradient orb */}
      <div className="absolute top-1/4 left-1/3 w-72 h-72 md:w-96 md:h-96 bg-hyper-accent/10 rounded-full blur-2xl md:blur-3xl animate-pulse" />

      {/* Main content - more compact */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 max-w-md md:max-w-xl mx-auto text-center">
        {/* Large 404 with floating animation */}
        <div className="relative mb-2">
          <div className="text-[6rem] md:text-[12rem] font-bold leading-none">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-hyper-accent via-hyper-accentHover to-hyper-glow animate-float">
              404
            </span>
          </div>
          {/* Orbiting elements around 404 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[104%] h-[104%] md:w-[120%] md:h-[120%]">
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 md:w-3 md:h-3 bg-hyper-accent rounded-full animate-[rotate-slow_8s_linear_infinite]"
              style={{ transformOrigin: "0 110px" }}
            />
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 md:w-2 md:h-2 bg-hyper-glow rounded-full animate-[rotate-slow_6s_linear_infinite_reverse]"
              style={{ transformOrigin: "0 90px" }}
            />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2 animate-slide-up">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Lost in Hyperspace
          </h1>
          <p className="text-hyper-400 font-mono text-sm">
            This page doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Primary action */}
        <ButtonLink href={PATH.root} variant="outline" size="lg">
          ← Back to Home
        </ButtonLink>

        {/* Quick links */}
        <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
          <span className="text-hyper-500 font-mono">or go to</span>
          <Link
            href={PATH.dashboard}
            className="text-hyper-accent hover:text-hyper-accentHover font-medium transition-colors underline-offset-4 hover:underline"
          >
            Dashboard
          </Link>
          <span className="text-hyper-700">•</span>
          <Link
            href={PATH.agent}
            className="text-hyper-accent hover:text-hyper-accentHover font-medium transition-colors underline-offset-4 hover:underline"
          >
            Agents
          </Link>
          <span className="text-hyper-700">•</span>
          <Link
            href={PATH.marketplace}
            className="text-hyper-accent hover:text-hyper-accentHover font-medium transition-colors underline-offset-4 hover:underline"
          >
            Marketplace
          </Link>
        </div>
      </div>

      {/* Decorative corner brackets - smaller and subtler */}
      <div className="absolute top-2 left-2 w-6 h-6 md:top-6 md:left-6 md:w-12 md:h-12 border-l border-t border-hyper-accent/20" />
      <div className="absolute top-2 right-2 w-6 h-6 md:top-6 md:right-6 md:w-12 md:h-12 border-r border-t border-hyper-accent/20" />
      <div className="absolute bottom-2 left-2 w-6 h-6 md:bottom-6 md:left-6 md:w-12 md:h-12 border-l border-b border-hyper-accent/20" />
      <div className="absolute bottom-2 right-2 w-6 h-6 md:bottom-6 md:right-6 md:w-12 md:h-12 border-r border-b border-hyper-accent/20" />
    </div>
  );
}
