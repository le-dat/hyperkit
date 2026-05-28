import React, { useState } from "react";
import { Loader2, CheckCircle2, ChevronDown, ChevronRight, Search, FileText, Globe, ExternalLink } from "lucide-react";
import { ThinkingStep } from "@/types";

interface AgentThinkingProcessProps {
  steps?: ThinkingStep[];
}

export function AgentThinkingProcess({ steps }: AgentThinkingProcessProps) {
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);
  const [isLatestOpen, setIsLatestOpen] = useState(true);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  if (!steps || steps.length === 0) return null;

  // Separate the prior completed steps from the latest active/running step
  const priorSteps = steps.slice(0, -1);
  const latestStep = steps[steps.length - 1];

  const extractDomain = (url: string): string => {
    if (!url) return "";
    if (url.startsWith("file:///")) {
      return "local docs";
    }
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace("www.", "");
    } catch {
      return "source";
    }
  };

  const parseSources = (output: any): Array<{ title: string; url: string; domain: string }> => {
    if (!output) return [];

    if (typeof output === "string") {
      try {
        const parsed = jsonSafeParse(output);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => {
            const url = item.url || item.source || "";
            const domain = extractDomain(url);
            return {
              title: item.title || item.name || (domain === "local docs" ? url.split("/").pop() : domain) || "Document",
              url: url,
              domain: domain
            };
          });
        }
      } catch {
        // Fallback to text parsing
      }

      // Regex URL extraction for raw text search tool outputs
      const urlRegex = /(https?:\/\/[^\s"'><()]+)/g;
      const matches = output.match(urlRegex);
      if (matches) {
        const uniqueUrls = Array.from(new Set(matches)) as string[];
        return uniqueUrls.map((url) => {
          const cleanUrl = url.replace(/[.,;)]$/, "");
          const domain = extractDomain(cleanUrl);
          return {
            title: domain.replace("www.", "") + " Source",
            url: cleanUrl,
            domain: domain
          };
        });
      }
    } else if (Array.isArray(output)) {
      return output.map((item: any) => {
        const url = item.url || item.source || "";
        const domain = extractDomain(url);
        return {
          title: item.title || item.name || "Source",
          url: url,
          domain: domain
        };
      });
    }

    return [];
  };

  const jsonSafeParse = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      if (str.endsWith("...")) {
        const lastBrack = str.lastIndexOf("}");
        const lastArr = str.lastIndexOf("]");
        const cutIndex = Math.max(lastBrack, lastArr);
        if (cutIndex !== -1) {
          try {
            return JSON.parse(str.substring(0, cutIndex + 1));
          } catch {
            return null;
          }
        }
      }
      return null;
    }
  };

  const isSearchTool = (tool: string) => {
    const name = tool.toLowerCase();
    return name.includes("search") || name.includes("web") || name.includes("local_docs") || name.includes("rag");
  };

  const renderStepDetails = (step: ThinkingStep, isSearch: boolean) => {
    const queryStr = typeof step.input === "string" 
      ? step.input 
      : (step.input?.query || step.input?.input || (step.input ? JSON.stringify(step.input) : ""));

    const sources = isSearch ? parseSources(step.output) : [];
    const isStepExpanded = expandedStepId === step.id;

    return (
      <div className="space-y-2.5 font-sans text-[11px]">
        {/* 1. Search Query Prefix */}
        {isSearch && queryStr && (
          <div className="flex items-center gap-2 text-hyper-400 text-[10px]">
            <span>🔍</span>
            <span className="italic truncate font-medium text-hyper-300">"{queryStr}"</span>
          </div>
        )}

        {/* 2. Visual Sources Grid / Favicons */}
        {isSearch && sources.length > 0 && (
          <div className="flex flex-wrap gap-2 py-1 items-center">
            {sources.slice(0, 3).map((source, index) => (
              <a
                key={index}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-hyper-800/50 bg-hyper-900/30 hover:bg-hyper-800/20 hover:border-hyper-700/60 text-[10px] text-hyper-200 transition-all duration-200 max-w-[190px] truncate group shadow-sm shrink-0"
                title={source.title}
              >
                {source.domain === "local docs" ? (
                  <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                ) : (
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=64`}
                    alt=""
                    className="w-3.5 h-3.5 shrink-0 rounded-sm"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <span className="truncate flex-1 font-medium group-hover:text-hyper-accent transition-colors">
                  {source.title}
                </span>
                <span className="text-[8px] text-hyper-500 uppercase tracking-wider shrink-0 font-mono group-hover:text-hyper-400">
                  {source.domain === "local docs" ? "docs" : source.domain.split(".")[0]}
                </span>
              </a>
            ))}

            {/* +X more badge */}
            {sources.length > 3 && (
              <span className="text-[9px] bg-hyper-800/40 border border-hyper-800/60 text-hyper-400 px-2 py-1 rounded-lg select-none font-medium">
                +{sources.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* 3. Bullet Point Status Indicator */}
        {step.status && (
          <div className="flex gap-1.5 items-center text-[10px] text-hyper-400 py-0.5 select-none">
            <span className="text-hyper-accent text-[12px] font-bold leading-none select-none">•</span>
            <span className="font-light">{step.status}</span>
          </div>
        )}

        {/* Detailed Output Collapsible (Standard Tools) */}
        {!isSearch && (
          <div className="space-y-1.5 font-mono">
            {isStepExpanded ? (
              <>
                {step.input && (
                  <pre className="text-[9px] bg-hyper-950 px-2.5 py-1.5 rounded-lg text-hyper-400 overflow-x-auto max-h-32 border border-hyper-800/30">
                    Input:{" "}
                    {typeof step.input === "string"
                      ? step.input
                      : JSON.stringify(step.input, null, 2)}
                  </pre>
                )}
                {step.output && (
                  <pre className="mt-1.5 text-[9px] bg-hyper-950 px-2.5 py-1.5 rounded-lg text-green-400/80 overflow-x-auto max-h-32 border border-hyper-800/30">
                    Output:{" "}
                    {typeof step.output === "string"
                      ? step.output
                      : JSON.stringify(step.output, null, 2)}
                  </pre>
                )}
              </>
            ) : (
              step.output && (
                <button
                  onClick={() => setExpandedStepId(step.id)}
                  className="text-[9px] text-hyper-400 hover:text-white bg-hyper-800/30 px-2 py-0.5 rounded border border-hyper-800/50 font-mono transition-all"
                >
                  Show Parameters
                </button>
              )
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPriorStep = (step: ThinkingStep) => {
    const isSearch = isSearchTool(step.tool);
    return (
      <div key={step.id} className="text-[11px] font-sans border-l border-hyper-800/40 pl-3.5 py-1 space-y-2 select-text">
        {/* Step Status Line */}
        <div className="flex items-center gap-2 text-hyper-300">
          {isSearch ? (
            <Search className="w-3.5 h-3.5 text-hyper-accent shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
          )}
          <span className="font-medium text-hyper-100 flex-1">
            {isSearch 
              ? (step.tool === "search_local_docs" ? "Searching local documentation" : "Searching the web")
              : (step.status || `Running tool: ${step.tool}`)}
          </span>
          {!isSearch && step.output && (
            <button
              onClick={() => setExpandedStepId(expandedStepId === step.id ? null : step.id)}
              className="text-[9px] hover:text-white bg-hyper-800/40 px-2 py-0.5 rounded border border-hyper-800/50 hover:bg-hyper-800/70 font-mono transition-all"
            >
              {expandedStepId === step.id ? "Hide Details" : "Show Details"}
            </button>
          )}
        </div>

        {/* Detailed details wrapper */}
        <div className="pl-5.5">
          {renderStepDetails(step, isSearch)}
        </div>
      </div>
    );
  };

  const isLatestSearch = isSearchTool(latestStep.tool);

  return (
    <div className="mb-4 rounded-xl border border-hyper-800/50 bg-hyper-900/10 backdrop-blur-sm overflow-hidden text-xs max-w-2xl shadow-xl transition-all duration-300 hover:border-hyper-700/40">
      
      {/* 1. Prior Completed Steps Dropdown */}
      {priorSteps.length > 0 && (
        <div className="border-b border-hyper-800/40">
          <button
            onClick={() => setIsCompletedOpen(!isCompletedOpen)}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-hyper-800/10 text-hyper-400 hover:text-hyper-200 transition-colors font-mono select-none"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span className="flex-1 text-left font-medium text-[10px] tracking-wider uppercase">
              Completed {priorSteps.length} step{priorSteps.length > 1 ? "s" : ""}
            </span>
            {isCompletedOpen ? (
              <ChevronDown className="w-4 h-4 shrink-0 text-hyper-500" />
            ) : (
              <ChevronRight className="w-4 h-4 shrink-0 text-hyper-500" />
            )}
          </button>
          
          {isCompletedOpen && (
            <div className="p-3 bg-hyper-950/20 space-y-3.5 border-t border-hyper-800/20">
              {priorSteps.map((step) => renderPriorStep(step))}
            </div>
          )}
        </div>
      )}

      {/* 2. Latest Step (Rendered fully open with its own collapse timeline style) */}
      <div className="p-3.5 space-y-2 bg-hyper-900/5">
        {/* Toggleable Step Header */}
        <button
          onClick={() => setIsLatestOpen(!isLatestOpen)}
          className="flex items-center gap-2.5 text-[11px] text-hyper-300 font-sans font-semibold hover:text-hyper-100 transition-colors select-none text-left w-full"
        >
          {isLatestSearch ? (
            <Search className={`w-4 h-4 text-hyper-accent shrink-0 ${!latestStep.isCompleted ? "animate-pulse" : ""}`} />
          ) : !latestStep.isCompleted ? (
            <Loader2 className="w-4 h-4 text-hyper-accent animate-spin shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          )}
          <span className="flex-1">
            {isLatestSearch 
              ? (latestStep.tool === "search_local_docs" ? "Searching local documentation" : "Searching the web")
              : (latestStep.status || `Running tool: ${latestStep.tool}`)}
          </span>
          {isLatestOpen ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
          )}
        </button>

        {/* Collapsible Content connected with a vertical timeline line */}
        {isLatestOpen && (
          <div className="border-l-2 border-hyper-800/60 ml-[7px] pl-4.5 pb-1 space-y-1 transition-all duration-300">
            {renderStepDetails(latestStep, isLatestSearch)}
          </div>
        )}
      </div>
    </div>
  );
}
