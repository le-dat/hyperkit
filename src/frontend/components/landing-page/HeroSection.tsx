"use client";

import { PATH } from "@/lib/constants";
import { ArrowRight, Code2, Cpu, Network, Terminal } from "lucide-react";
import { ButtonLink } from "../ui/button";
import { CyclingCode } from "./hero/CyclingCode";
import { HeroStats } from "./hero/HeroStats";
import { ParticleFlow } from "./hero/ParticleFlow";
import { TerminalText } from "./hero/TerminalText";

export function HeroSection() {
  return (
    <div className="relative min-h-screen flex items-center overflow-hidden">
      {/* Main content */}
      <div className="max-w-7xl w-full mx-auto px-4 md:px-8 relative z-10 py-12 md:py-20">
        {/* Diagonal split layout */}
        <div className="flex flex-col md:flex-row gap-12 md:gap-16 items-center">
          {/* Left: Content with terminal aesthetic */}
          <div className="w-full md:w-1/2 space-y-8 md:space-y-10">
            {/* Main headline with typing effect */}
            <div className="space-y-3 md:space-y-4 mt-8">
              <h1 className="text-5xl md:text-7xl md:font-black font-bold tracking-tighter leading-[1.05] md:leading-[0.9] font-mono">
                <div className="text-white">
                  <TerminalText text="Build" delay={0} />
                </div>
                <div className="text-white mt-2">
                  <TerminalText text="Workflows" delay={200} />
                </div>
                <div className="relative inline-block mt-2">
                  <span className="relative z-10 bg-gradient-to-r from-hyper-accent via-orange-500 to-red-500 bg-clip-text text-transparent animate-gradient">
                    <TerminalText text="with AI" delay={500} />
                  </span>
                  {/* Glitch effect layers */}
                  <span
                    className="absolute top-0 left-0 bg-gradient-to-r from-hyper-accent via-orange-500 to-red-500 bg-clip-text text-transparent opacity-30"
                    style={{ transform: "translate(-2px,2px)" }}
                  >
                    <TerminalText text="with AI" delay={500} />
                  </span>
                </div>
              </h1>

              {/* ASCII art decoration */}
              <div className="font-mono text-xs text-hyper-accent/40 leading-tight pt-2">
                ╭─────────────────────────────────╮
              </div>
            </div>

            {/* Description */}
            <p className="text-base md:text-xl md:lg:text-2xl text-hyper-300 leading-relaxed max-w-xl font-light">
              The AI-native workflow engine.{" "}
              <span className="font-mono text-hyper-accent font-semibold">
                Connect LLMs
              </span>{" "}
              to your data, APIs, and smart contracts via{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-white font-bold">
                  Model Context Protocol
                </span>
                <span className="absolute bottom-0 left-0 w-full h-1 bg-hyper-accent/30"></span>
              </span>
              .
            </p>

            {/* CTA Buttons with magnetic effect */}
            <div className="flex flex-col md:flex-row gap-4 pt-4">
              <ButtonLink href={PATH.agent} variant="gradient" size="lg">
                Start Building Free
                <ArrowRight className="w-5 h-5" />
              </ButtonLink>

              <ButtonLink href={PATH.marketplace} variant="outline" size="lg">
                <Terminal className="w-5 h-5" />
                Browse Templates
              </ButtonLink>
            </div>

            {/* Tech stack indicators */}
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 pt-4 md:pt-6 flex-wrap">
              <div className="flex items-center gap-2 text-hyper-400">
                <Cpu className="w-5 h-5 text-hyper-accent" />
                <span className="text-xs md:text-sm font-mono">
                  GPT-4 • Claude • Gemini
                </span>
              </div>
              <div className="flex items-center gap-2 text-hyper-400">
                <Network className="w-5 h-5 text-hyper-accent" />
                <span className="text-xs md:text-sm font-mono">
                  100+ Integrations
                </span>
              </div>
              <div className="flex items-center gap-2 text-hyper-400">
                <Code2 className="w-5 h-5 text-hyper-accent" />
                <span className="text-xs md:text-sm font-mono">
                  Open Source
                </span>
              </div>
            </div>
          </div>

          {/* Right: Cycling code examples */}
          <div className="w-full md:w-1/2 mt-10 md:mt-0 flex justify-center">
            <div
              className="relative"
              style={{
                transform: "perspective(1000px) rotateY(-5deg)",
              }}
            >
              <CyclingCode />

              {/* Floating workflow icons */}
              {/* <div className="absolute -top-6 -right-6 w-12 h-12 rounded-xl bg-gradient-to-br from-hyper-accent to-orange-600 flex items-center justify-center shadow-lg animate-float">
                <GitBranch className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-6 -left-6 w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg animate-float-delayed">
                <Sparkles className="w-6 h-6 text-white" />
              </div> */}
            </div>
          </div>
        </div>

        {/* Bottom stats bar with terminal aesthetic */}
        <HeroStats />
      </div>
    </div>
  );
}
