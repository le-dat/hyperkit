import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "DeFi Agent",
  description:
    "Talk to your Hyperkit DeFi Agent and automate workflows on DeFi protocols.",
};

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
