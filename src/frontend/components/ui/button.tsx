import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-hyper-accent text-white hover:bg-hyper-accentHover",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-hyper-700 bg-hyper-900/80 text-hyper-300 shadow-xs hover:bg-hyper-800/70 hover:text-hyper-accent dark:bg-hyper-900 dark:border-hyper-800 dark:hover:bg-hyper-800/60",
        secondary: "bg-hyper-800 text-hyper-200 hover:bg-hyper-700",
        ghost:
          "hover:bg-hyper-800/40 hover:text-hyper-accent dark:hover:bg-hyper-800/60 dark:hover:text-hyper-accent",
        link: "text-hyper-accent underline-offset-4 hover:underline",
        gradient:
          "group relative bg-gradient-to-r from-hyper-accent to-orange-600 hover:from-hyper-accentHover hover:to-orange-700 text-white rounded-lg font-bold shadow-lg shadow-hyper-accent/25 hover:shadow-hyper-accent/40 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hyper-accent focus-visible:ring-offset-2 focus-visible:ring-offset-hyper-950 overflow-hidden",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {variant === "gradient" && (
        <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 -skew-x-12 -translate-x-full" />
      )}
      {children}
    </Comp>
  );
}

function ButtonLink({
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {variant === "gradient" && (
        <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 -skew-x-12 -translate-x-full" />
      )}
      {children}
    </Link>
  );
}

export { Button, ButtonLink, buttonVariants };
