"use client";

import ClerkAuthProvider from "./ClerkAuthProvider";
import ReactQueryProvider from "./ReactQueryProvider";
import { Toaster } from "sonner";
import { MaintenanceModal } from "@/components/ui/maintenance-modal";

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkAuthProvider>
      <ReactQueryProvider>
        {children}
        <MaintenanceModal />
      </ReactQueryProvider>
      <Toaster richColors position="top-center" closeButton={false} duration={2000} />
    </ClerkAuthProvider>
  );
};

export default AppProvider;

