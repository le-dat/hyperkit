"use client";

import { Toaster } from "sonner";
import ClerkAuthProvider from "./ClerkAuthProvider";
import ReactQueryProvider from "./ReactQueryProvider";

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkAuthProvider>
      <ReactQueryProvider>{children}</ReactQueryProvider>
      <Toaster richColors position="top-center" closeButton={false} duration={2000} />
    </ClerkAuthProvider>
  );
};

export default AppProvider;
