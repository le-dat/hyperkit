export function getBubbleClasses(isUser: boolean): string {
  const baseClasses = ["min-w-0", "w-full", "break-words"];
  const roleClasses = isUser
    ? "px-4 py-3 md:px-5 text-white"
    : "px-4 py-4 md:px-5 md:py-5 text-hyper-100";
  return [...baseClasses, roleClasses].join(" ");
}

export function getCodeBackgroundClass(isUser: boolean): string {
  return isUser ? "bg-hyper-900" : "bg-hyper-800";
}

export function getTableClasses(isUser: boolean): string {
  const borderClass = isUser ? "border-hyper-700" : "border-hyper-800";
  return `min-w-full border ${borderClass}`;
}

export function getThClasses(isUser: boolean): string {
  const borderClass = isUser ? "border-hyper-700" : "border-hyper-800";
  return `border ${borderClass} bg-hyper-900 px-4 py-2 text-left font-semibold`;
}

export function getTdClasses(isUser: boolean): string {
  const borderClass = isUser ? "border-hyper-700" : "border-hyper-800";
  return `border ${borderClass} px-4 py-2`;
}

export function getBlockquoteClasses(isUser: boolean): string {
  const borderClass = isUser ? "border-hyper-600" : "border-hyper-700";
  return `border-l-4 ${borderClass} pl-4 italic`;
}
