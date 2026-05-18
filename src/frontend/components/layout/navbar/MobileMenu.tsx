import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface MenuItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: MenuItem[];
  onNavigate?: (path: string) => void;
}

export function MobileMenu({
  isOpen,
  onClose,
  items,
  onNavigate,
}: MobileMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      router.push(path);
    }
    onClose();
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + "/");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with fade-in animation */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Menu panel with slide-in from right animation */}
      <div className="fixed top-16 right-0 w-64 h-[calc(100vh-4rem)] bg-hyper-900/95 backdrop-blur-xl border-l border-hyper-800/50 shadow-2xl z-40 md:hidden animate-in slide-in-from-right duration-300">
        <div className="flex flex-col p-4 gap-1">
          {items.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-all duration-200
                  ${
                    active
                      ? "bg-hyper-800 text-white"
                      : "text-hyper-400 hover:bg-hyper-800/50 hover:text-white"
                  }
                `}
              >
                <item.icon
                  className={`w-5 h-5 ${active ? "text-hyper-accent" : ""}`}
                />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
