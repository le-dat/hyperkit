"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PATH } from "@/lib/constants";
import { DashboardSection } from "@/components/landing-page/DashboardSection";
import { FinanceModernSection } from "@/components/landing-page/FinanceModernSection";
import { Footer } from "@/components/landing-page/Footer";
import { HeroSection } from "@/components/landing-page/HeroSection";
import { Navbar } from "@/components/landing-page/Navbar";
import { PricingSection } from "@/components/landing-page/PricingSection";
import { StatsSection } from "@/components/landing-page/StatsSection";
import { TestimonialsSection } from "@/components/landing-page/TestimonialsSection";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.replace(PATH.agent);
    }
  }, [isSignedIn, router]);

  return (
    <div
      className={cn(
        "min-h-screen  bg-hyper-950 text-white overflow-x-hidden relative grid-bg",
      )}
    >
      {/* <div className="hidden md:block absolute inset-0">
        <ParticleFlow />
      </div> */}

      <Navbar />
      <HeroSection />
      <DashboardSection />
      <FinanceModernSection />
      <TestimonialsSection />
      <PricingSection />
      <StatsSection />
      <Footer />
    </div>
  );
}
