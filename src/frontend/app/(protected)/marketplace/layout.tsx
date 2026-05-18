import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Discover and install new Hyperkit workflows and agents from the Marketplace.",
};

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
