import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register",
  description: "Register to your Hyperkit account",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
