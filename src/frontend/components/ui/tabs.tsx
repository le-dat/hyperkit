import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | undefined>(
  undefined,
);

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "pills";
}

function TabsList({ className, variant = "default", ...props }: TabsListProps) {
  return (
    <div
      className={cn(
        "flex",
        {
          "border-b border-hyper-800": variant === "default",
          "bg-hyper-900 rounded-lg p-1 border border-hyper-800":
            variant === "pills",
        },
        className,
      )}
      {...props}
    />
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  variant?: "default" | "pills";
}

function TabsTrigger({
  className,
  value,
  variant = "default",
  ...props
}: TabsTriggerProps) {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("TabsTrigger must be used within Tabs");
  }

  const isActive = context.value === value;

  return (
    <button
      className={cn(
        "text-sm font-medium transition-all flex items-center gap-2",
        {
          "px-4 py-3 border-b-2 transition-colors": variant === "default",
          "px-4 py-1.5 rounded-md": variant === "pills",
        },
        variant === "default" &&
          (isActive
            ? "border-hyper-accent text-white"
            : "border-transparent text-hyper-500 hover:text-hyper-300"),
        variant === "pills" &&
          (isActive
            ? "bg-hyper-800 text-white shadow-sm"
            : "text-hyper-400 hover:text-hyper-200"),
        className,
      )}
      onClick={() => context.onValueChange(value)}
      {...props}
    />
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

function TabsContent({ className, value, ...props }: TabsContentProps) {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("TabsContent must be used within Tabs");
  }

  if (context.value !== value) return null;

  return <div className={className} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
