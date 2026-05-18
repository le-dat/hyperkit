// Placeholder store - to be implemented
import { create } from "zustand";

interface Toast {
  title: string;
  description?: string;
  type?: "success" | "error" | "info" | "warning";
}

interface ToastStore {
  showToast: (toast: Toast) => void;
}

export const useToastStore = create<ToastStore>(() => ({
  showToast: (_toast: Toast) => {
    // Placeholder implementation
    console.log("Toast:", _toast);
  },
}));
