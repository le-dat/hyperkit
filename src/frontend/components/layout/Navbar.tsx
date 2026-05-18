"use client";

import { PATH } from "@/lib/constants";
import { useMobileMenuStore } from "@/store/useMobileMenuStore";
import { Bot, LayoutGrid, Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Logo } from "./navbar/Logo";
import { MobileMenu } from "./navbar/MobileMenu";
import { NavigationTabs } from "./navbar/NavigationTabs";
import { UserProfile } from "./navbar/UserProfile";

interface MenuItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    icon: LayoutGrid,
    label: "Dashboard",
    path: PATH.dashboard,
  },
  { id: "agent", icon: Bot, label: "Agent Chat", path: PATH.agent },
];

export function Navbar() {
  const openMenu = useMobileMenuStore((state) => state.openMenu);
  const setOpenMenu = useMobileMenuStore((state) => state.setOpenMenu);
  const isMobileOpen = openMenu === "mobile-menu";
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
    setOpenMenu(null);
  };

  const handleGoHome = () => {
    setOpenMenu(null);
  };

  return (
    <>
      <div className="h-16 border-b border-hyper-800 bg-hyper-950/80 backdrop-blur-md flex items-center px-6 shrink-0 z-50">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-8">
            <Logo onClick={handleGoHome} />
            <NavigationTabs items={menuItems} onNavigate={handleNavigation} />
          </div>

          <div className="flex items-center gap-4">
            <UserProfile />
            <button
              onClick={() => setOpenMenu(isMobileOpen ? null : "mobile-menu")}
              className="md:hidden p-2 text-hyper-400 hover:text-white transition-colors cursor-pointer"
            >
              {isMobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <MobileMenu
        isOpen={isMobileOpen}
        onClose={() => setOpenMenu(null)}
        items={menuItems}
        onNavigate={handleNavigation}
      />
    </>
  );
}
