"use client";

import * as LucideIcons from "lucide-react";

export function OAuthPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 px-6">
      <div className="w-12 h-12 rounded-full bg-hyper-900/50 flex items-center justify-center border border-hyper-800">
        <LucideIcons.Layers className="w-6 h-6 text-hyper-400" />
      </div>
      <h4 className="font-medium text-white text-sm">OAuth Flows Coming Soon</h4>
      <p className="text-xs text-hyper-500 max-w-xs leading-relaxed">
        Connect your accounts directly via secure OAuth single sign-on flows. Supported services like Notion and Google Docs will be active in an upcoming update.
      </p>
    </div>
  );
}
