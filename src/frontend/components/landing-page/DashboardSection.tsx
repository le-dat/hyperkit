"use client";

import { cn } from "@/lib/utils";
import {
  Zap,
  Activity,
  Workflow,
  Cpu,
  BarChart3,
  Bell,
  DollarSign,
  Users,
  CheckCircle,
} from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

export function DashboardSection() {
  return (
    <div className={cn("py-16 md:py-32 relative")} id="demo">
      {/* Ambient background glow */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 w-[400px] h-[250px] md:w-[800px] md:h-[500px] bg-hyper-accent/20 blur-[60px] md:blur-[120px] rounded-full pointer-events-none z-0 opacity-30"></div>

      <div
        className={cn(
          "max-w-full md:max-w-7xl mx-auto px-4 md:px-8 relative z-10",
        )}
      >
        <ScrollReveal>
          <div className={cn("text-center mb-10 md:mb-16")}>
            <div
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-hyper-900/50 border border-hyper-accent/30 text-sm font-medium text-hyper-200 shadow-lg shadow-hyper-accent/10 mb-4",
              )}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-hyper-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-hyper-accent"></span>
              </span>
              Dashboard Preview
            </div>
            <h2
              className={cn("text-2xl md:text-5xl font-bold text-white mb-4")}
            >
              Powerful insights,{" "}
              <span
                className={cn(
                  "text-transparent bg-clip-text bg-gradient-to-r from-hyper-accent to-orange-500",
                )}
              >
                beautiful interface
              </span>
            </h2>
            <p
              className={cn(
                "text-hyper-400 text-base md:text-lg max-w-xl md:max-w-2xl mx-auto",
              )}
            >
              Monitor your workflows in real-time with our intuitive dashboard.
              Track performance, manage agents, and optimize your automation.
            </p>
          </div>
        </ScrollReveal>

        {/* Dashboard Mockup with Browser Chrome */}
        <ScrollReveal delay={200}>
          <div className={cn("relative max-w-full md:max-w-6xl mx-auto")}>
            {/* Ambient glow behind mockup */}
            <div className="absolute inset-0 bg-gradient-to-t from-hyper-accent/10 to-transparent blur-xl md:blur-3xl -z-10"></div>

            {/* Browser Window */}
            <div
              className={cn(
                "relative rounded-2xl bg-hyper-900 border border-white/10 shadow-2xl overflow-hidden group hover:border-white/20 transition-all duration-500",
              )}
            >
              {/* Browser Header */}
              <div
                className={cn(
                  "h-10 md:h-12 border-b border-white/5 bg-hyper-950 flex items-center px-2 md:px-4 gap-2 md:gap-3",
                )}
              >
                <div className="flex gap-1 md:gap-2">
                  <div className="w-2.5 md:w-3 h-2.5 md:h-3 rounded-full bg-red-500/30 border border-red-500/50"></div>
                  <div className="w-2.5 md:w-3 h-2.5 md:h-3 rounded-full bg-yellow-500/30 border border-yellow-500/50"></div>
                  <div className="w-2.5 md:w-3 h-2.5 md:h-3 rounded-full bg-green-500/30 border border-green-500/50"></div>
                </div>
                <div
                  className={cn(
                    "mx-auto w-40 md:w-80 h-6 md:h-7 bg-white/5 rounded-md flex items-center justify-center text-xs text-gray-600 font-mono",
                  )}
                >
                  hyperkit.ai/dashboard
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="flex flex-col md:flex-row h-[560px] md:h-[600px] text-left bg-hyper-950">
                {/* Sidebar */}
                <div
                  className={cn(
                    "flex md:flex flex-row md:flex-col w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 bg-hyper-900 p-2 md:p-4 md:gap-6 gap-2 md:gap-6 md:block",
                    "md:visible md:relative",
                  )}
                  style={{ display: "flex" }}
                >
                  {/* Sidebar visible as vertical on md, otherwise horizontal on mobile at the top */}
                  <div className="flex items-center gap-2 md:gap-3 px-2">
                    <div className="w-7 md:w-8 h-7 md:h-8 rounded-lg bg-gradient-to-br from-hyper-accent to-orange-600 flex items-center justify-center">
                      <Zap className="w-4 md:w-5 h-4 md:h-5 text-white" />
                    </div>
                    <span className="font-semibold text-xs md:text-sm text-white">
                      Dashboard
                    </span>
                  </div>
                  <div className="flex md:block flex-row md:flex-col md:space-y-1 gap-1 md:gap-0 w-full md:w-auto">
                    <div
                      className={cn(
                        "flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 bg-white/5 rounded-lg border border-white/5 text-white text-xs md:text-sm",
                      )}
                    >
                      <Activity className="w-4 h-4" />
                      <span>Overview</span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors text-xs md:text-sm cursor-pointer",
                      )}
                    >
                      <Workflow className="w-4 h-4" />
                      <span>Workflows</span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors text-xs md:text-sm cursor-pointer",
                      )}
                    >
                      <Cpu className="w-4 h-4" />
                      <span>Agents</span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors text-xs md:text-sm cursor-pointer",
                      )}
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>Analytics</span>
                    </div>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 bg-hyper-950 p-4 md:p-8 relative overflow-hidden">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 gap-4 md:gap-0">
                    <div>
                      <h3 className="text-lg md:text-xl font-semibold text-white">
                        Welcome back, Alex
                      </h3>
                      <p className="text-xs md:text-sm text-gray-500 mt-1">
                        Here&apos;s your workflow performance today.
                      </p>
                    </div>
                    <div className="flex gap-2 md:gap-3">
                      <div
                        className={cn(
                          "w-9 md:w-10 h-9 md:h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors",
                        )}
                      >
                        <Bell className="w-4 h-4" />
                      </div>
                      <div
                        className={cn(
                          "w-9 md:w-10 h-9 md:h-10 rounded-full bg-gradient-to-br from-hyper-accent to-orange-600 flex items-center justify-center text-white text-xs md:text-sm font-bold",
                        )}
                      >
                        AK
                      </div>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                    {/* Executions Card */}
                    <div
                      className={cn(
                        "col-span-1 rounded-xl p-4 md:p-5 border border-white/10 bg-gradient-to-br from-hyper-accent/20 to-orange-600/10 relative overflow-hidden group/card hover:border-white/20 transition-all",
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                      <div className="flex justify-between items-start mb-2 md:mb-4 relative z-10">
                        <div className="p-2 rounded-lg bg-hyper-accent/20 text-hyper-accent">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                          +12.5%
                        </span>
                      </div>
                      <div className="relative z-10">
                        <div className="text-xs md:text-sm text-gray-400 mb-1">
                          Executions
                        </div>
                        <div className="text-xl md:text-2xl font-bold text-white">
                          24,532
                        </div>
                      </div>
                    </div>

                    {/* Active Agents Card */}
                    <div
                      className={cn(
                        "rounded-xl p-4 md:p-5 border border-white/10 bg-hyper-900 hover:border-white/20 transition-all",
                      )}
                    >
                      <div className="flex justify-between items-start mb-2 md:mb-4">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                          <Users className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-xs md:text-sm text-gray-400 mb-1">
                        Active Agents
                      </div>
                      <div className="text-xl md:text-2xl font-bold text-white">
                        18
                        <span className="text-gray-600 text-base md:text-lg font-normal">
                          /25
                        </span>
                      </div>
                    </div>

                    {/* Success Rate Card */}
                    <div
                      className={cn(
                        "rounded-xl p-4 md:p-5 border border-white/10 bg-hyper-900 hover:border-white/20 transition-all",
                      )}
                    >
                      <div className="flex justify-between items-start mb-2 md:mb-4">
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-xs md:text-sm text-gray-400 mb-1">
                        Success Rate
                      </div>
                      <div className="text-xl md:text-2xl font-bold text-white">
                        99.2%
                      </div>
                    </div>
                  </div>

                  {/* Chart Area */}
                  <div
                    className={cn(
                      "rounded-xl border border-white/10 bg-hyper-900 p-4 md:p-6 h-40 md:h-64 flex flex-col justify-between relative overflow-hidden hover:border-white/20 transition-all",
                    )}
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-3 md:mb-4">
                      <div className="text-xs md:text-sm font-medium text-white mb-2 md:mb-0">
                        Workflow Performance
                      </div>
                      <div className="flex gap-3 md:gap-4 items-center">
                        <div className="flex items-center gap-1 md:gap-2">
                          <div className="w-2.5 md:w-3 h-2.5 md:h-3 rounded-full bg-hyper-accent"></div>
                          <span className="text-xs text-gray-500">
                            This Week
                          </span>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                          <div className="w-2.5 md:w-3 h-2.5 md:h-3 rounded-full bg-gray-700"></div>
                          <span className="text-xs text-gray-500">
                            Last Week
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* CSS Bar Chart */}
                    <div className="flex items-end justify-between gap-1 md:gap-2 h-full w-full px-1 md:px-2">
                      <div className="w-full bg-gray-800/30 rounded-t-sm h-[40%] hover:bg-hyper-accent/50 transition-colors duration-300 cursor-pointer"></div>
                      <div className="w-full bg-gray-800/30 rounded-t-sm h-[60%] hover:bg-hyper-accent/50 transition-colors duration-300 cursor-pointer"></div>
                      <div className="w-full bg-gray-800/30 rounded-t-sm h-[45%] hover:bg-hyper-accent/50 transition-colors duration-300 cursor-pointer"></div>
                      <div className="w-full bg-gray-800/30 rounded-t-sm h-[70%] hover:bg-hyper-accent/50 transition-colors duration-300 cursor-pointer"></div>
                      <div className="w-full bg-gray-800/30 rounded-t-sm h-[55%] hover:bg-hyper-accent/50 transition-colors duration-300 cursor-pointer"></div>
                      <div
                        className={cn(
                          "w-full bg-gray-800/30 rounded-t-sm h-[80%] hover:bg-hyper-accent/50 transition-colors duration-300 cursor-pointer relative group/bar",
                        )}
                      >
                        <div
                          className={cn(
                            "absolute -top-7 md:-top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-xs text-white px-1.5 md:px-2 py-0.5 md:py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap",
                          )}
                        >
                          Peak: 8.2k
                        </div>
                      </div>
                      <div className="w-full bg-gray-800/30 rounded-t-sm h-[65%] hover:bg-hyper-accent/50 transition-colors duration-300 cursor-pointer"></div>
                      <div className="w-full bg-gray-800/30 rounded-t-sm h-[50%] hover:bg-hyper-accent/50 transition-colors duration-300 cursor-pointer"></div>
                      <div className="w-full bg-gray-800/30 rounded-t-sm h-[75%] hover:bg-hyper-accent/50 transition-colors duration-300 cursor-pointer"></div>
                      <div
                        className={cn(
                          "w-full bg-gradient-to-t from-hyper-accent/50 to-hyper-accent rounded-t-sm h-[90%] shadow-[0_0_10px_rgba(255,62,0,0.25)] md:shadow-[0_0_15px_rgba(255,62,0,0.3)]",
                        )}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
