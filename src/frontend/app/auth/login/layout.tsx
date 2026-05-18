import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your Hyperkit account",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
