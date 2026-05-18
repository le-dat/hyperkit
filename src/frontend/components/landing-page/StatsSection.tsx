"use client";

import { cn } from "@/lib/utils";
import {
  GoogleCloudLogo,
  LinearLogo,
  OpenAILogo,
  UniswapLogo,
  VercelLogo,
} from "./CompanyLogos";
import { ScrollReveal } from "./ScrollReveal";

const SOCIAL_STATS = [
  { name: "OpenAI", Logo: OpenAILogo },
  { name: "Google Cloud", Logo: GoogleCloudLogo },
  { name: "Uniswap", Logo: UniswapLogo },
  { name: "Linear", Logo: LinearLogo },
  { name: "Vercel", Logo: VercelLogo },
];

export function StatsSection() {
  return (
    <div
      className={cn(
        "relative border-y border-hyper-800/50 bg-hyper-900/20 py-8 md:py-20 overflow-hidden",
      )}
    >
      {/* Subtle background gradient */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-transparent via-hyper-accent/5 to-transparent",
        )}
      ></div>

      <div className={cn("relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8")}>
        <ScrollReveal>
          <div className={cn("text-center mb-6 md:mb-16")}>
            <p
              className={cn(
                "text-hyper-500 text-sm md:text-base font-medium uppercase tracking-widest",
              )}
            >
              Trusted by teams at
            </p>
          </div>
        </ScrollReveal>

        <div
          className={cn(
            "flex flex-wrap justify-center items-center gap-x-4 gap-y-4 md:gap-x-16 md:gap-y-12",
          )}
        >
          {SOCIAL_STATS.map((company) => {
            const LogoComponent = company.Logo;
            const isVercel = company.name === "Vercel";

            return (
              <ScrollReveal
                key={company.name}
                delay={SOCIAL_STATS.indexOf(company) * 100}
              >
                <div
                  className={cn(
                    "group cursor-default flex items-center gap-2 md:gap-6 py-1 md:py-4 opacity-60 hover:opacity-100 transition-opacity duration-300",
                  )}
                >
                  <LogoComponent
                    className={cn(
                      "text-hyper-400 group-hover:text-white transition-all duration-300 group-hover:scale-110 shrink-0",
                      isVercel
                        ? "w-10 h-10 md:w-20 md:h-20 lg:w-24 lg:h-24"
                        : "w-6 h-6 md:w-10 md:h-10 lg:w-12 lg:h-12",
                    )}
                  />
                  {!isVercel && (
                    <span
                      className={cn(
                        "text-xs md:text-xl lg:text-2xl font-bold text-hyper-500 group-hover:text-hyper-200 transition-colors duration-300 whitespace-nowrap",
                      )}
                    >
                      {company.name}
                    </span>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </div>
  );
}
