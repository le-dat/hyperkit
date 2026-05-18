"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { JWT_TEMPLATES } from "@/lib/constants";
import { useAuth, useUser } from "@clerk/nextjs";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { useState, useCallback } from "react";

interface TimeOption {
  label: string;
  value: (typeof JWT_TEMPLATES)[keyof typeof JWT_TEMPLATES];
  seconds: number;
  description: string;
}

const TIME_OPTIONS: TimeOption[] = [
  {
    label: "15 minutes",
    value: JWT_TEMPLATES.SESSION_900S,
    seconds: 900,
    description: "Quick tasks",
  },
  {
    label: "1 year",
    value: JWT_TEMPLATES.LONG_LIVED_TESTING,
    seconds: 31536000,
    description: "Long testing",
  },
];

export function JwtTab() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [selectedTime, setSelectedTime] = useState<TimeOption>(TIME_OPTIONS[1]);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string>("");

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError("");

    try {
      // Use Clerk's getToken with custom template or default
      const token = await getToken({
        template: selectedTime.value,
      });

      if (token) {
        setGeneratedToken(token);
      } else {
        setError("Failed to generate token. Please try again.");
      }
    } catch (err) {
      console.error("Failed to generate JWT:", err);
      setError("Failed to generate token. Please ensure you're authenticated.");
    } finally {
      setIsGenerating(false);
    }
  }, [getToken, selectedTime]);

  const handleCopy = useCallback(async () => {
    if (!generatedToken) {
      setError("No token to copy.");
      return;
    }
    await navigator.clipboard.writeText(generatedToken);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [generatedToken]);

  const formatExpiryTime = () => {
    if (!generatedToken) {
      setError("No token to format.");
      return "";
    }
    const now = new Date();
    const expiry = new Date(now.getTime() + selectedTime.seconds * 1000);
    return expiry.toLocaleString();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 p-4 md:p-6 pb-3 md:pb-4 border-b border-hyper-800/50">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            JWT Tokens
          </h1>
          <p className="text-xs md:text-sm text-hyper-400">
            Generate and manage your JSON Web Tokens
          </p>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-5">
        {/* Time Configuration */}
        <div className="p-4 rounded-lg bg-hyper-950/30 border border-hyper-800">
          <label className="text-sm font-medium text-white mb-2 block">
            Token Expiration
          </label>
          <select
            value={selectedTime.value}
            onChange={(e) => {
              const option = TIME_OPTIONS.find(
                (opt) => opt.value === e.target.value,
              );
              if (option) setSelectedTime(option);
            }}
            className={cn(
              "w-full px-4 py-2.5 rounded-lg border bg-hyper-950/60 text-white appearance-none cursor-pointer transition-all focus:outline-none",
              "border-hyper-800 hover:border-hyper-accent/50 focus:border-hyper-accent text-sm",
            )}
          >
            {TIME_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-hyper-950"
              >
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>

        {/* Generate Button */}
        <div className="flex gap-3">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !user}
            className={cn(
              "flex-1 bg-hyper-accent hover:bg-hyper-accentHover",
              (isGenerating || !user) && "opacity-50 cursor-not-allowed",
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate Token
              </>
            )}
          </Button>
          {generatedToken && (
            <Button onClick={handleCopy} variant="outline">
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </>
              )}
            </Button>
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Generated Token Display */}
        {generatedToken && (
          <div className="p-4 rounded-lg bg-hyper-950/30 border border-hyper-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">
                Generated Token
              </span>
              <span className="text-xs text-hyper-500">
                Expires: {formatExpiryTime()}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-hyper-950/60 border border-hyper-800/50 font-mono text-xs text-hyper-300 break-all">
              {generatedToken}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
