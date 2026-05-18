import { Navbar } from "@/components/layout/Navbar";
import Loading from "../loading";
import { ClerkLoaded, ClerkLoading, SignedIn, SignedOut } from "@clerk/nextjs";
import ProtectedRedirect from "@/components/auth/ProtectedRedirect";

export function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <ClerkLoading>
        <Loading />
      </ClerkLoading>
      <ClerkLoaded>
        <SignedIn>{children}</SignedIn>
        <SignedOut>
          <ProtectedRedirect />
        </SignedOut>
      </ClerkLoaded>
    </>
  );
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RootLayout>
      <div className="flex flex-col h-screen bg-hyper-950 text-white overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </RootLayout>
  );
}
