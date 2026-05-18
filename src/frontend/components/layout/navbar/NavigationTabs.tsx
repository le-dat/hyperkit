import { usePathname, useRouter } from "next/navigation";

interface MenuItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

interface NavigationTabsProps {
  items: MenuItem[];
  onNavigate?: (path: string) => void;
}

export function NavigationTabs({ items, onNavigate }: NavigationTabsProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      router.push(path);
    }
  };

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + "/");
  };

  return (
    <div className="hidden md:flex items-center bg-hyper-900 rounded-lg p-1 border border-hyper-800">
      {items.map((item) => {
        const active = isActive(item.path);
        return (
          <button
            key={item.id}
            aria-label={item.label}
            role="tab"
            tabIndex={-1}
            onClick={() => handleNavigation(item.path)}
            className={`cursor-pointer px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2
              ${
                active ? "bg-hyper-800 text-white shadow-sm" : "text-hyper-400 hover:text-hyper-200"
              }
            `}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
