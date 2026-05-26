"use client";

import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { McpCatalogItem } from "@/service/mcpService";

interface CredentialConfigFormProps {
  item: McpCatalogItem;
  isToggling: boolean;
  onCancel: () => void;
  onSave: (token: string) => void;
}

export function CredentialConfigForm({
  item,
  isToggling,
  onCancel,
  onSave,
}: CredentialConfigFormProps) {
  // Token lives entirely within this form — never persisted in parent state
  const [token, setToken] = useState("");
  return (
    <div className="absolute inset-0 bg-hyper-950/95 backdrop-blur-md flex flex-col justify-center p-6 z-50 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-hyper-900 border border-hyper-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-hyper-accent/10 flex items-center justify-center">
            <LucideIcons.KeyRound className="w-5 h-5 text-hyper-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white">Configure {item.label}</h3>
            <p className="text-xs text-hyper-400">Provide the required credentials to enable this integration</p>
          </div>
        </div>

        <div className="space-y-4">
          {item.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-xs font-semibold text-hyper-300">{field.label}</label>
              <input
                type={field.type === "password" ? "password" : "text"}
                placeholder={field.placeholder}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full h-10 px-3 bg-hyper-950 border border-hyper-800 rounded-xl text-white placeholder:text-hyper-600 focus:border-hyper-accent focus:ring-1 focus:ring-hyper-accent outline-none text-sm transition-all"
              />
              {field.help_text && (
                <p className="text-[11px] text-hyper-500 leading-normal">{field.help_text}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 justify-end pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-hyper-400 hover:text-white bg-transparent rounded-xl hover:bg-hyper-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(token)}
            disabled={isToggling || !token.trim()}
            className="px-4 py-2 text-xs font-semibold text-black bg-white rounded-xl hover:bg-slate-100 transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isToggling && <LucideIcons.Loader2 className="w-3 h-3 animate-spin" />}
            Enable & Save
          </button>
        </div>
      </div>
    </div>
  );
}
