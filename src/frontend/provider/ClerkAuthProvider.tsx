import { PATH } from "@/lib/constants";
import { ClerkProvider } from "@clerk/nextjs";

interface ClerkAuthProviderProps {
  children: React.ReactNode;
}

export function ClerkAuthProvider({ children }: ClerkAuthProviderProps) {
  return (
    <ClerkProvider
      signInUrl={PATH.auth}
      signUpUrl={PATH.auth}
      afterSignOutUrl={PATH.auth}
    >
      {children}
    </ClerkProvider>
  );
}

export default ClerkAuthProvider;
