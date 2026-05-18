"use client";

import { LOGO_PATH, PATH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonLink } from "../ui/button";

const NAV_LINKS = [
  { href: "#demo", text: "Demo" },
  { href: "#finance", text: "Finance" },
  { href: "#testimonials", text: "Testimonials" },
  { href: "#pricing", text: "Pricing" },
] as const;

// Constants
const SCROLL_THRESHOLD = 80;
const NAVBAR_HEIGHT = 80;
const SCROLL_RESET_DELAY = 1000;
const INTERSECTION_ROOT_MARGIN = "-20% 0px -70% 0px";
const INTERSECTION_THRESHOLDS: number[] = [0, 0.25, 0.5, 0.75, 1];

export function Navbar() {
  const [activeSection, setActiveSection] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const { isSignedIn } = useAuth();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Throttled scroll handler using requestAnimationFrame
  useEffect(() => {
    function handleScroll() {
      if (rafRef.current) return;

      rafRef.current = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY >= SCROLL_THRESHOLD);
        rafRef.current = null;
      });
    }

    // Check initial scroll position using requestAnimationFrame to avoid setState in effect
    requestAnimationFrame(() => {
      setIsScrolled(window.scrollY >= SCROLL_THRESHOLD);
    });

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const sections = NAV_LINKS.map((link) => ({
      id: link.href.substring(1),
      href: link.href,
    }));

    // Create Intersection Observer with rootMargin to account for navbar height
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Don't update during programmatic scroll (click navigation)
        if (isScrollingRef.current) return;

        // Find the most visible section
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length === 0) return;

        // Sort by intersection ratio to find the most visible section
        const mostVisible = visibleEntries.reduce((prev, current) =>
          current.intersectionRatio > prev.intersectionRatio ? current : prev,
        );

        const sectionId = mostVisible.target.id;
        if (sectionId) {
          setActiveSection(`#${sectionId}`);
        }
      },
      {
        rootMargin: INTERSECTION_ROOT_MARGIN,
        threshold: INTERSECTION_THRESHOLDS,
      },
    );

    // Observe all sections
    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    // Set initial active section using requestAnimationFrame to avoid setState in effect
    requestAnimationFrame(() => {
      const scrollPosition = window.scrollY + SCROLL_THRESHOLD;
      for (const { id, href } of sections) {
        const element = document.getElementById(id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(href);
            break;
          }
        }
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const handleNavClick = useCallback((href: string) => {
    setActiveSection(href);
    isScrollingRef.current = true;

    const sectionId = href.substring(1);
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - NAVBAR_HEIGHT;
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });

      // Clear existing timeout if any
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Reset flag after scroll completes
      scrollTimeoutRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
        scrollTimeoutRef.current = null;
      }, SCROLL_RESET_DELAY);
    }
  }, []);

  return (
    <nav
      className={cn(
        "fixed w-full z-50 border-hyper-800 ",
        isScrolled && "bg-hyper-950/80 backdrop-blur-md border-b ",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link
            href={PATH.root}
            className="flex items-center group gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hyper-accent rounded-lg"
            aria-label="Hyperkit Home"
          >
            <Image
              src={LOGO_PATH}
              alt="Hyperkit"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="font-bold text-2xl tracking-tight">
              Hyper<span className="text-hyper-accent">kit</span>
            </span>
          </Link>
          <div className="hidden md:flex space-x-1 text-sm font-medium">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.text}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className={cn(
                  "px-4 py-2 text-hyper-300 hover:text-white hover:bg-hyper-900/50 rounded-lg transition-all hover-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hyper-accent",
                  activeSection === link.href &&
                    "text-hyper-accent bg-hyper-900/50",
                )}
              >
                {link.text}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {!isSignedIn && (
              <Link
                href={PATH.auth}
                className="text-sm font-medium text-hyper-300 hover:text-white hidden md:block px-4 py-2 hover:bg-white/5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hyper-accent"
              >
                Sign In
              </Link>
            )}
            <ButtonLink href={PATH.agent} variant="gradient" size="lg">
              Launch App
            </ButtonLink>
          </div>
        </div>
      </div>
    </nav>
  );
}
