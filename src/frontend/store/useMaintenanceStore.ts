import { create } from "zustand";

interface MaintenanceState {
  isMaintenance: boolean;
  setMaintenance: (isMaintenance: boolean) => void;
}

export const useMaintenanceStore = create<MaintenanceState>()((set) => ({
  isMaintenance: false,
  setMaintenance: (isMaintenance: boolean) => set({ isMaintenance }),
}));
