import { useEffect } from "react";
import { useDevice } from "@/hooks/useDevice";
import { useMobileMenuStore } from "@/store/useMobileMenuStore";

export function useSidebarState() {
  const { isMobile } = useDevice();
  const { openMenu, setOpenMenu } = useMobileMenuStore();
  const isSidebarOpen = isMobile ? openMenu === "chat-sidebar" : true;

  // Close mobile menus when resizing to desktop
  useEffect(() => {
    if (!isMobile && openMenu) {
      setOpenMenu(null);
    }
  }, [isMobile, openMenu, setOpenMenu]);

  return {
    isSidebarOpen,
    setOpenMenu,
    isMobile,
  };
}
