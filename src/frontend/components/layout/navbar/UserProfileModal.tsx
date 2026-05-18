"use client";

import { Modal } from "@/components/ui/modal";
import useHotKey from "@/hooks/useHotKey";
import { cn } from "@/lib/utils";
import { useClerk } from "@clerk/nextjs";
import { CreditCard, Key, Package, TrendingUp, UserCircle } from "lucide-react";
import { useState } from "react";
import { AccountTab } from "./user-profile-tabs/AccountTab";
import { BillingTab } from "./user-profile-tabs/BillingTab";
import { JwtTab } from "./user-profile-tabs/JwtTab";
import { UsageTab } from "./user-profile-tabs/UsageTab";
import { YourBuildsTab } from "./user-profile-tabs/YourBuildsTab";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export enum TabType {
  Account = "account",
  Billing = "billing",
  Usage = "usage",
  Jwt = "jwt",
  YourBuilds = "your-builds",
}

const tabs = [
  { id: TabType.Account, label: "Account", icon: UserCircle },
  { id: TabType.Billing, label: "Plan & Billing", icon: CreditCard },
  { id: TabType.Usage, label: "Usage", icon: TrendingUp },
  { id: TabType.Jwt, label: "JWT", icon: Key },
  { id: TabType.YourBuilds, label: "Your Builds", icon: Package },
];

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { signOut } = useClerk();
  const [activeTab, setActiveTab] = useState<TabType>(TabType.Account);

  useHotKey("Escape", onClose, { enabled: isOpen });

  const handleSignOut = () => {
    signOut();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      className="max-w-6xl md:my-8 my-0"
    >
      <div className="flex flex-col md:flex-row h-[85vh] md:h-[70vh] bg-hyper-950">
        {/* Mobile Tab Navigation */}
        <div className="md:hidden border-b border-hyper-800/60 bg-hyper-900/50 backdrop-blur-sm overflow-x-auto">
          <nav className="flex px-4 py-3 gap-2 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                    isActive
                      ? "bg-hyper-800 text-white shadow-lg shadow-hyper-accent/10 ring-1 ring-hyper-accent/20"
                      : "text-hyper-400 hover:bg-hyper-800/50 hover:text-white",
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0",
                      isActive && "text-hyper-accent",
                    )}
                  />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:w-72 border-r border-hyper-800/60 bg-hyper-900/50 p-6 flex-col backdrop-blur-sm">
          {/* Personal Section */}
          <div className="flex-1">
            <h3 className="text-xs font-semibold text-hyper-500 uppercase tracking-wider mb-3">
              Personal
            </h3>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-hyper-800 text-white shadow-lg shadow-hyper-accent/10 ring-1 ring-hyper-accent/20"
                        : "text-hyper-400 hover:bg-hyper-800/50 hover:text-white",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4.5 h-4.5 shrink-0",
                        isActive && "text-hyper-accent",
                      )}
                    />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sign Out - Minimal prominence */}
          <div className="mt-auto pt-6 border-t border-hyper-800/60">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-xs text-hyper-600 hover:text-hyper-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === TabType.Account && <AccountTab />}
          {activeTab === TabType.Billing && <BillingTab />}
          {activeTab === TabType.Usage && <UsageTab />}
          {activeTab === TabType.Jwt && <JwtTab />}
          {activeTab === TabType.YourBuilds && <YourBuildsTab />}
        </div>

        {/* Mobile Sign Out - Minimal text button */}
        <div className="md:hidden border-t border-hyper-800/60 bg-hyper-900/50 px-4 py-2 backdrop-blur-sm">
          <button
            onClick={handleSignOut}
            className="w-full text-center text-xs text-hyper-600 hover:text-hyper-400 transition-colors py-1.5"
          >
            Sign Out
          </button>
        </div>
      </div>
    </Modal>
  );
}
