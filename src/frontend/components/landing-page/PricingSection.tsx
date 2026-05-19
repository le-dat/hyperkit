"use client";

import { PATH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Button, ButtonLink } from "../ui/button";
import { ScrollReveal } from "./ScrollReveal";

const PRICING_TIERS = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for getting started",
    features: [
      "Up to 100 workflows/month",
      "Basic MCP integrations",
      "Community support",
      "Public templates",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Professional",
    price: "$29",
    period: "/month",
    description: "For growing teams",
    features: [
      "Unlimited workflows",
      "Advanced MCP integrations",
      "Priority support",
      "Private templates",
      "Custom integrations",
      "Analytics dashboard",
    ],
    cta: "Start Free Trial",
    popular: true,
    disabled: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    features: [
      "Everything in Professional",
      "Dedicated support",
      "Custom SLA",
      "On-premise deployment",
      "Advanced security",
      "Team management",
    ],
    cta: "Contact Sales",
    popular: false,
    disabled: true,
  },
];

export function PricingSection() {
  return (
    <div className={cn("py-12 md:py-32 relative")} id="pricing">
      <div className={cn("max-w-7xl mx-auto px-4 md:px-6 lg:px-8")}>
        <ScrollReveal>
          <div className={cn("text-center mb-10 md:mb-20")}>
            <div
              className={cn(
                "inline-block px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-hyper-900/30 border border-hyper-800 text-xs md:text-sm font-medium text-hyper-400 mb-3 md:mb-4",
              )}
            >
              Pricing
            </div>
            <h2
              className={cn(
                "text-2xl md:text-5xl font-bold text-white mb-3 md:mb-4",
              )}
            >
              Simple,{" "}
              <span
                className={cn(
                  "text-transparent bg-clip-text bg-gradient-to-r from-hyper-accent to-orange-500",
                )}
              >
                transparent pricing
              </span>
            </h2>
            <p
              className={cn(
                "text-hyper-400 text-base md:text-lg max-w-md md:max-w-2xl mx-auto",
              )}
            >
              Choose the plan that fits your needs. Upgrade or downgrade at any
              time.
            </p>
          </div>
        </ScrollReveal>

        <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8")}>
          {PRICING_TIERS.map((tier) => (
            <ScrollReveal
              key={tier.name}
              delay={PRICING_TIERS.indexOf(tier) * 100}
            >
              <div
                className={cn(
                  "relative p-4 md:p-8 rounded-2xl border transition-all duration-300",
                  tier.disabled
                    ? "bg-hyper-900/20 border-hyper-800/50 opacity-60"
                    : tier.popular
                      ? "bg-hyper-900/50 border-hyper-accent/50 shadow-lg shadow-hyper-accent/10 hover-lift"
                      : "bg-hyper-900/30 border-hyper-800 hover:border-hyper-700 hover-lift",
                )}
              >
                {tier.popular && (
                  <div
                    className={cn(
                      "absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 px-3 py-0.5 md:px-4 md:py-1 rounded-full bg-gradient-to-r from-hyper-accent to-orange-600 text-white text-xs md:text-sm font-bold",
                    )}
                  >
                    Most Popular
                  </div>
                )}
                <div className={cn("mb-4 md:mb-6")}>
                  <h3
                    className={cn(
                      "text-lg md:text-2xl font-bold text-white mb-1 md:mb-2",
                    )}
                  >
                    {tier.name}
                  </h3>
                  <div
                    className={cn(
                      "flex items-baseline gap-1 md:gap-2 mb-1 md:mb-2",
                    )}
                  >
                    <span
                      className={cn(
                        "text-2xl md:text-4xl font-bold text-white",
                      )}
                    >
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span
                        className={cn("text-hyper-400 text-sm md:text-base")}
                      >
                        {tier.period}
                      </span>
                    )}
                  </div>
                  <p className={cn("text-hyper-400 text-xs md:text-sm")}>
                    {tier.description}
                  </p>
                </div>
                <ul className={cn("space-y-2 md:space-y-3 mb-6 md:mb-8")}>
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className={cn("flex items-start gap-2 md:gap-3")}
                    >
                      <Check
                        className={cn(
                          "w-4 h-4 md:w-5 md:h-5 text-green-400 shrink-0 mt-0.5",
                        )}
                      />
                      <span
                        className={cn("text-hyper-300 text-xs md:text-base")}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                {tier.disabled ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    size="lg"
                    disabled
                  >
                    {tier.cta}
                  </Button>
                ) : (
                  <ButtonLink
                    href={PATH.agent}
                    variant={tier.popular ? "gradient" : "outline"}
                    className="w-full"
                    size="lg"
                  >
                    {tier.cta}
                  </ButtonLink>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
