"use client";

import ClerkAuthProvider from "./ClerkAuthProvider";
import ReactQueryProvider from "./ReactQueryProvider";
import { Toaster } from "sonner";

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkAuthProvider>
      <ReactQueryProvider>{children}</ReactQueryProvider>
      <Toaster richColors position="bottom-right" closeButton />
    </ClerkAuthProvider>
  );
};

export default AppProvider;
