import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColorClass?: string;
  iconBgClass?: string;
  action?: ReactNode;
}

export function SectionHeader({
  icon: Icon,
  title,
  description,
  iconColorClass = "text-blue-400",
  iconBgClass = "bg-linear-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20",
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-11 h-11 rounded-xl ${iconBgClass} ${
            action ? "group-hover:scale-110" : ""
          } transition-transform`}
        >
          <Icon className={`w-5 h-5 ${iconColorClass}`} />
        </div>
        <div>
          <h3 className="text-lg font-black text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-hyper-500">{description}</p>
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
