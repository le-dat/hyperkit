"use client";

import { Avatar } from "@/components/ui/avatar";
import { useUser } from "@clerk/nextjs";
import { UserProfileModal } from "@/components/layout/navbar/UserProfileModal";
import { useState } from "react";

interface UserProfileProps {
  showPlan?: boolean;
  size?: "sm" | "md" | "lg";
}

export function UserProfile({
  showPlan = true,
  size = "md",
}: UserProfileProps) {
  const { user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName[0].toUpperCase();
    }
    if (user?.emailAddresses?.[0]?.emailAddress) {
      return user.emailAddresses[0].emailAddress[0].toUpperCase();
    }
    return "U";
  };

  const getUserName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    return user?.emailAddresses?.[0]?.emailAddress || "User";
  };

  return (
    <>
      <div
        className="flex items-center gap-3 cursor-pointer group"
        onClick={() => setIsModalOpen(true)}
      >
        {showPlan && (
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-xs font-bold text-white group-hover:text-hyper-300 transition-colors">
              {getUserName()}
            </span>
            {/* <span className="text-[10px] text-hyper-500 group-hover:text-hyper-400 transition-colors">
              Pro Plan
            </span> */}
          </div>
        )}
        {user?.imageUrl ? (
          <Avatar
            src={user?.imageUrl}
            alt={getUserName()}
            className="ring-2 ring-transparent group-hover:ring-hyper-accent/50 transition-all"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-hyper-accent to-orange-400 flex items-center justify-center text-xs font-bold text-white shadow-lg group-hover:ring-2 ring-hyper-accent/50 transition-all group-hover:scale-105">
            {getUserInitials()}
          </div>
        )}
      </div>

      <UserProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
