import { create } from "zustand";

export type MenuType = "mobile-menu" | "chat-sidebar" | null;

interface MobileMenuState {
  openMenu: MenuType;
  setOpenMenu: (menu: MenuType) => void;
  closeAll: () => void;
}

export const useMobileMenuStore = create<MobileMenuState>()((set) => ({
  openMenu: null,
  setOpenMenu: (menu) => set({ openMenu: menu }),
  closeAll: () => set({ openMenu: null }),
}));
