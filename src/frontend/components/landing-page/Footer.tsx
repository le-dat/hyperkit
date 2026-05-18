"use client";

import { cn } from "@/lib/utils";
import { Box, Github, Linkedin, Twitter } from "lucide-react";
import { Button } from "../ui/button";

export function Footer() {
  const footerLinks = {
    Product: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Use Cases", href: "#use-cases" },
      { label: "Documentation", href: "#docs" },
    ],
    Company: [
      { label: "About", href: "#about" },
      { label: "Blog", href: "#blog" },
      { label: "Careers", href: "#careers" },
      { label: "Contact", href: "#contact" },
    ],
    Resources: [
      { label: "Documentation", href: "#docs" },
      { label: "API Reference", href: "#api" },
      { label: "GitHub", href: "#github" },
      { label: "Discord", href: "#discord" },
    ],
  };

  const socialLinks = [
    { icon: Github, href: "#github", label: "GitHub" },
    { icon: Twitter, href: "#twitter", label: "Twitter" },
    { icon: Linkedin, href: "#linkedin", label: "LinkedIn" },
  ];

  return (
    <footer className={cn("relative border-t border-hyper-800/50 py-10")}>
      <div className={cn("max-w-7xl mx-auto px-4")}>
        {/* Footer main grid */}
        <div
          className={cn(
            // For mobile: stack, for md+ use a 2-col grid with branding/links separation
            "flex flex-col gap-10 mb-10 md:mb-12 md:grid md:grid-cols-2",
          )}
        >
          {/* Brand section */}
          <div className={cn("mb-4 md:mb-0")}>
            <div className={cn("flex items-center mb-4")}>
              <div
                className={cn(
                  "w-8 h-8 bg-gradient-to-br from-hyper-accent to-orange-600 rounded-lg flex items-center justify-center mr-2",
                )}
              >
                <Box className="text-white w-5 h-5" />
              </div>
              <span className={cn("font-bold text-xl")}>
                Hyper<span className="text-hyper-accent">kit</span>
              </span>
            </div>
            <p className={cn("text-hyper-500 text-sm leading-relaxed mb-6")}>
              The AI-native workflow engine for the modern web. Build, deploy,
              and scale intelligent automations.
            </p>
            {/* Social links */}
            <div className={cn("flex gap-4")}>
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    className={cn(
                      "w-10 h-10 rounded-lg bg-hyper-900/50 border border-hyper-800 flex items-center justify-center text-hyper-400 hover:text-hyper-accent hover:border-hyper-accent transition-all hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hyper-accent",
                    )}
                    aria-label={social.label}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Links sections */}
          <div className={cn("grid gap-4 grid-cols-2 md:grid-cols-3 md:gap-8")}>
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className={cn("text-white font-semibold mb-3")}>
                  {category}
                </h4>
                <ul className={cn("space-y-2")}>
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className={cn(
                          "text-hyper-500 hover:text-hyper-accent text-sm transition-colors hover-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hyper-accent rounded",
                        )}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter signup */}
        <div
          className={cn(
            // Stack fields vertical on mobile; row at md+
            "border-t border-hyper-800/50 pt-8 mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
          )}
        >
          <div>
            <h4 className={cn("text-white font-semibold mb-2")}>
              Stay updated
            </h4>
            <p className={cn("text-hyper-400 text-sm")}>
              Get the latest news and updates delivered to your inbox.
            </p>
          </div>
          <form
            className={cn(
              "flex flex-col gap-2 w-full md:flex-row md:w-auto md:gap-2",
            )}
          >
            <input
              type="email"
              placeholder="Enter your email"
              className={cn(
                "px-4 py-2 rounded-lg bg-hyper-900/50 border border-hyper-800 text-white placeholder-hyper-500 focus:outline-none focus:ring-2 focus:ring-hyper-accent focus:border-transparent",
                "w-full md:w-64",
              )}
              aria-label="Email address"
            />
            <Button type="submit" variant="gradient" size="lg">
              Subscribe
            </Button>
          </form>
        </div>

        {/* Bottom bar */}
        <div
          className={cn(
            // flex-col (vertical stack) on mobile, row at md+
            "pt-8 border-t border-hyper-800/50 flex flex-col gap-4 md:flex-row md:justify-between md:items-center text-hyper-600 text-sm",
          )}
        >
          <p className="text-center md:text-left">
            &copy; 2025 Hyperkit Inc. All rights reserved.
          </p>
          <div className={cn("flex justify-center gap-6")}>
            <a
              href="#privacy"
              className={cn(
                "hover:text-hyper-accent transition-colors hover-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hyper-accent rounded",
              )}
            >
              Privacy
            </a>
            <a
              href="#terms"
              className={cn(
                "hover:text-hyper-accent transition-colors hover-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hyper-accent rounded",
              )}
            >
              Terms
            </a>
            <a
              href="#security"
              className={cn(
                "hover:text-hyper-accent transition-colors hover-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hyper-accent rounded",
              )}
            >
              Security
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
