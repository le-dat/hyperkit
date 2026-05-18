"use client";

import { cn } from "@/lib/utils";
import { ScrollReveal } from "./ScrollReveal";

const TESTIMONIALS = [
  {
    name: "Sarah Chen",
    role: "CTO, TechStart",
    company: "TechStart",
    avatar: "SC",
    quote:
      "Hyperkit transformed how we build workflows. What used to take days now takes minutes.",
    rating: 5,
  },
  {
    name: "Michael Rodriguez",
    role: "Lead Developer",
    company: "CloudScale",
    avatar: "MR",
    quote:
      "The MCP integration is a game-changer. We can now connect all our internal tools seamlessly.",
    rating: 5,
  },
  {
    name: "Emily Watson",
    role: "Product Manager",
    company: "DataFlow",
    avatar: "EW",
    quote:
      "The AI-powered workflow builder is incredibly intuitive. Our team adopted it immediately.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <div className={cn("py-12 md:py-32 relative")} id="testimonials">
      <div className={cn("max-w-7xl mx-auto px-4 sm:px-6 lg:px-8")}>
        <ScrollReveal>
          <div className={cn("text-center mb-10 md:mb-20")}>
            <div
              className={cn(
                "inline-block px-2.5 md:px-4 py-1.5 md:py-2 rounded-full bg-hyper-900/30 border border-hyper-800 text-xs md:text-sm font-medium text-hyper-400 mb-3 md:mb-4",
              )}
            >
              Testimonials
            </div>
            <h2
              className={cn(
                "text-2xl md:text-5xl font-bold text-white mb-3 md:mb-4",
              )}
            >
              Loved by{" "}
              <span
                className={cn(
                  "text-transparent bg-clip-text bg-gradient-to-r from-hyper-accent to-orange-500",
                )}
              >
                developers
              </span>
            </h2>
          </div>
        </ScrollReveal>

        <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8")}>
          {TESTIMONIALS.map((testimonial) => (
            <ScrollReveal
              key={testimonial.name}
              delay={TESTIMONIALS.indexOf(testimonial) * 100}
            >
              <div
                className={cn(
                  "p-4 md:p-8 rounded-2xl bg-hyper-900/30 border border-hyper-800 hover:border-hyper-700 transition-all duration-300 hover-lift mb-2 md:mb-0",
                )}
              >
                <div className={cn("flex items-center gap-1 mb-2 md:mb-4")}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span
                      key={i}
                      className={cn("text-yellow-400 text-base md:text-lg")}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <p
                  className={cn(
                    "text-hyper-300 mb-4 md:mb-6 italic text-sm md:text-base",
                  )}
                >
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className={cn("flex items-center gap-2 md:gap-4")}>
                  <div
                    className={cn(
                      "w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-hyper-accent to-orange-600 flex items-center justify-center text-white font-bold text-base md:text-xl",
                    )}
                  >
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div
                      className={cn(
                        "text-white font-semibold text-sm md:text-base",
                      )}
                    >
                      {testimonial.name}
                    </div>
                    <div className={cn("text-hyper-400 text-xs md:text-sm")}>
                      {testimonial.role}, {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
