import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initials?: string;
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "gradient";
}

const sizeClasses = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
  xl: "w-12 h-12 text-base",
};

function Avatar({
  className,
  initials,
  src,
  alt,
  size = "md",
  variant = "default",
  ...props
}: AvatarProps) {
  const baseClasses = cn(
    "rounded-full flex items-center justify-center font-bold text-white shrink-0",
    sizeClasses[size],
    {
      "bg-gradient-to-tr from-hyper-accent to-orange-400":
        variant === "gradient",
      "bg-hyper-700": variant === "default",
    },
    className,
  );

  if (src) {
    return (
      <div className={baseClasses} {...props}>
        <Image
          src={src}
          alt={alt || initials || "Avatar"}
          width={
            parseInt(sizeClasses[size].split("w-")[1]?.split(" ")[0] || "32") *
            4
          }
          height={
            parseInt(sizeClasses[size].split("h-")[1]?.split(" ")[0] || "32") *
            4
          }
          className="w-full h-full rounded-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={baseClasses} {...props}>
      {initials || "U"}
    </div>
  );
}

export { Avatar };
