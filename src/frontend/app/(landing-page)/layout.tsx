import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hyperkit",
  description:
    "Hyperkit is the AI-native workflow engine. Connect LLMs to your data, APIs, and smart contracts via Model Context Protocol.",
};

export default function LandingPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
