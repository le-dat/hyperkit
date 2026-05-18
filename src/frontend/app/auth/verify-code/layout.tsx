import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verify Code",
  description: "Verify your code to complete your registration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
