"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import {
  Camera,
  Check,
  Loader2,
  Mail,
  Phone,
  Trash2,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type UserType = ReturnType<typeof useUser>["user"];

// Helper to get initials
const getUserInitials = (user: UserType) => {
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

// Input field component with enhanced styling
interface InputFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  error?: string;
}
const InputField = ({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  className,
  icon,
  error,
}: InputFieldProps) => (
  <div className="relative group">
    {icon && (
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-hyper-500 group-focus-within:text-hyper-accent transition-colors duration-200 z-10">
        {icon}
      </div>
    )}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-full px-4 py-3.5 border-2 rounded-xl focus:outline-none transition-all duration-300",
        icon && "pl-11",
        disabled
          ? "border-hyper-800/50 bg-hyper-900/20 text-hyper-500 cursor-not-allowed backdrop-blur-sm"
          : "border-hyper-800 bg-hyper-950/40 text-white placeholder:text-hyper-600 focus:border-hyper-accent focus:bg-hyper-950/60 hover:border-hyper-700 backdrop-blur-md",
        error && "border-red-500/50 focus:border-red-500",
        className,
      )}
    />
    {error && <p className="text-xs text-red-400 mt-1.5 ml-1">{error}</p>}
  </div>
);

// Avatar upload component with drag & drop
interface AvatarUploadProps {
  user: UserType;
  onUpload: (file: File) => void;
  isUploading: boolean;
}
const AvatarUpload = ({ user, onUpload, isUploading }: AvatarUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        onUpload(file);
      }
    },
    [onUpload],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onUpload(file);
      }
    },
    [onUpload],
  );

  return (
    <div
      className="relative inline-block group/avatar"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={cn(
          "relative w-28 h-28 rounded-2xl transition-all duration-500 transform",
          isDragging && "scale-110 rotate-2",
          isUploading && "animate-pulse",
        )}
      >
        {user?.imageUrl ? (
          <div className="relative w-full h-full">
            <Avatar
              src={user?.imageUrl}
              alt={user?.firstName || "User"}
              size="xl"
              className="w-full h-full ring-4 ring-hyper-accent/20 group-hover/avatar:ring-hyper-accent/40 transition-all duration-500 shadow-2xl shadow-hyper-accent/10"
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-hyper-950/0 via-hyper-950/0 to-hyper-accent/0 group-hover/avatar:from-hyper-950/40 group-hover/avatar:to-hyper-accent/20 transition-all duration-500 backdrop-blur-[1px]" />
          </div>
        ) : (
          <div className="w-full h-full rounded-2xl bg-gradient-to-br from-hyper-accent via-orange-600 to-red-600 flex items-center justify-center shadow-2xl shadow-hyper-accent/30 group-hover/avatar:shadow-hyper-accent/50 transition-all duration-500 group-hover/avatar:scale-105 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
            <span className="text-white text-3xl font-bold relative z-10">
              {getUserInitials(user)}
            </span>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-hyper-950/80 rounded-2xl backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-hyper-accent animate-spin" />
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-br from-hyper-accent to-orange-600 rounded-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 shadow-xl shadow-hyper-accent/30 hover:shadow-hyper-accent/50 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Camera className="w-5 h-5 text-white group-hover/btn:rotate-12 transition-transform duration-300" />
      </button>

      {isDragging && (
        <div className="absolute inset-0 -m-4 border-4 border-dashed border-hyper-accent rounded-3xl bg-hyper-accent/5 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <p className="text-hyper-accent font-semibold text-sm">
            Drop image here
          </p>
        </div>
      )}
    </div>
  );
};

// Main Component
export function AccountTab() {
  const { user } = useUser();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync state when user data loads
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
    }
  }, [user]);

  const hasChanges = useMemo(
    () =>
      firstName !== (user?.firstName || "") ||
      lastName !== (user?.lastName || ""),
    [firstName, lastName, user?.firstName, user?.lastName],
  );

  const handleUpdate = useCallback(async () => {
    if (!hasChanges || !user) return;

    setIsSaving(true);
    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      toast.success("Account details updated!");
    } catch (error) {
      console.error("Failed to update user:", error);
      toast.error("Failed to update account details", {
        description: "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, firstName, lastName, user]);

  const handleAvatarUpload = useCallback(
    async (file: File) => {
      if (!user) return;

      setIsUploading(true);
      try {
        await user.setProfileImage({ file });
      } catch (error) {
        console.error("Failed to upload avatar:", error);
      } finally {
        setIsUploading(false);
      }
    },
    [user],
  );

  const handleRemoveAvatar = useCallback(async () => {
    if (!user) return;

    setIsUploading(true);
    try {
      await user.setProfileImage({ file: null });
    } catch (error) {
      console.error("Failed to remove avatar:", error);
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  const handleRemovePhone = useCallback(
    async (phoneId: string) => {
      if (!user) return;
      try {
        await user.phoneNumbers.find((p) => p.id === phoneId)?.destroy();
      } catch (error) {
        console.error("Failed to remove phone:", error);
      }
    },
    [user],
  );

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-hyper-accent/5 via-transparent to-orange-600/5 opacity-50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-hyper-accent/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Fixed Header */}
      <div className="relative z-10 flex-shrink-0 p-4 md:p-6 pb-3 md:pb-4 border-b border-hyper-800/50 backdrop-blur-lg">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 bg-gradient-to-r from-white via-hyper-accent to-orange-500 bg-clip-text text-transparent">
            Account Settings
          </h1>
          <p className="text-xs md:text-sm text-hyper-400">
            Manage your profile and preferences
          </p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6 space-y-5 md:space-y-6 pb-32">
        {/* Avatar & Name Combined Section */}
        <div className="p-4 md:p-5 rounded-xl bg-hyper-950/30 border border-hyper-800 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <AvatarUpload
                user={user}
                onUpload={handleAvatarUpload}
                isUploading={isUploading}
              />
              {user?.imageUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={isUploading}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 text-xs font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>

            {/* Name Fields */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                  <User className="w-4 h-4 text-hyper-accent" />
                  Personal Information
                </h3>
                <p className="text-xs text-hyper-500 mb-3">Update your name</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InputField
                  value={firstName}
                  onChange={setFirstName}
                  placeholder="First name"
                  icon={<User className="w-4 h-4" />}
                />
                <InputField
                  value={lastName}
                  onChange={setLastName}
                  placeholder="Last name"
                  icon={<User className="w-4 h-4" />}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Email Section - Minimized */}
        <div className="p-4 md:p-5 rounded-xl bg-hyper-950/30 border border-hyper-800 backdrop-blur-xl">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-hyper-accent" />
            Email Addresses
          </h3>
          <div className="space-y-2">
            {user?.emailAddresses.map((email) => (
              <div
                key={email.id}
                className="flex items-center justify-between p-3 rounded-lg bg-hyper-950/40 border border-hyper-800/50 hover:border-hyper-700/50 transition-all duration-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {email.emailAddress}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {email.id === user.primaryEmailAddressId && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-hyper-accent/20 text-hyper-accent">
                          Primary
                        </span>
                      )}
                      {email.verification?.status === "verified" ? (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                          Unverified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phone Section - Minimized */}
        {user?.phoneNumbers && user.phoneNumbers.length > 0 && (
          <div className="p-4 md:p-5 rounded-xl bg-hyper-950/30 border border-hyper-800 backdrop-blur-xl">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-400" />
              Phone Numbers
            </h3>
            <div className="space-y-2">
              {user.phoneNumbers.map((phone) => (
                <div
                  key={phone.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-hyper-950/40 border border-hyper-800/50 hover:border-hyper-700/50 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">
                        {phone.phoneNumber}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {phone.id === user.primaryPhoneNumberId && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                            Primary
                          </span>
                        )}
                        {phone.verification?.status === "verified" ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            Verified
                          </span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                            Unverified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {phone.id !== user.primaryPhoneNumberId && (
                    <button
                      onClick={() => handleRemovePhone(phone.id)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-4 md:p-5 bg-gradient-to-t from-hyper-950 via-hyper-950/95 to-transparent backdrop-blur-xl border-t border-hyper-800 transition-all duration-500 transform z-20",
          hasChanges
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0 pointer-events-none",
        )}
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-hyper-accent rounded-full animate-pulse" />
            <p className="text-xs md:text-sm text-hyper-400">Unsaved changes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setFirstName(user?.firstName || "");
                setLastName(user?.lastName || "");
              }}
              variant="outline"
              className="flex-1 sm:flex-none px-4 md:px-5 py-2 text-sm bg-transparent hover:bg-hyper-900/50 border border-hyper-800 hover:border-hyper-700 text-white transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!hasChanges || isSaving}
              className={cn(
                "flex-1 sm:flex-none px-5 md:px-7 py-2 text-sm bg-gradient-to-r from-hyper-accent to-orange-600 hover:from-hyper-accent/90 hover:to-orange-600/90 text-white shadow-lg shadow-hyper-accent/20 transition-all duration-300 relative overflow-hidden group/btn",
                (!hasChanges || isSaving) && "opacity-50 cursor-not-allowed",
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : showSuccess ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved!
                </>
              ) : (
                <>Save Changes</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
