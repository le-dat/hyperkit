import { useState } from "react";
import {
  CalendarClock,
  Repeat,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import { Input, Select } from "@/components/ui/input";

interface ScheduleConfigProps {
  scheduleEnabled: boolean;
  onScheduleEnabledChange: (enabled: boolean) => void;
}

export function ScheduleConfig({
  scheduleEnabled,
  onScheduleEnabledChange,
}: ScheduleConfigProps) {
  const [triggerTab, setTriggerTab] = useState<"interval" | "daily" | "weekly">(
    "interval",
  );
  const [intervalValue, setIntervalValue] = useState(15);
  const [intervalUnit, setIntervalUnit] = useState("minutes");
  const [dailyTime, setDailyTime] = useState("09:00");
  const [weeklyDays, setWeeklyDays] = useState<string[]>(["Mon", "Wed", "Fri"]);
  const [weeklyTime, setWeeklyTime] = useState("09:00");

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const toggleDay = (day: string) => {
    if (weeklyDays.includes(day)) {
      setWeeklyDays(weeklyDays.filter((d) => d !== day));
    } else {
      setWeeklyDays([...weeklyDays, day]);
    }
  };

  return (
    <div className="bg-hyper-900 border border-hyper-800 rounded-xl overflow-hidden">
      <div className="p-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-hyper-800 flex items-center justify-center border border-hyper-700">
            <CalendarClock className="w-5 h-5 text-hyper-accent" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Schedule Trigger</h3>
            <p className="text-xs text-hyper-500">
              Run this workflow automatically.
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            onChange={(e) => onScheduleEnabledChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-hyper-800 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-hyper-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-hyper-accent"></div>
        </label>
      </div>

      {scheduleEnabled && (
        <div className="border-t border-hyper-800 bg-black/20">
          <div className="flex p-2 gap-2 border-b border-hyper-800/50">
            <button
              onClick={() => setTriggerTab("interval")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                triggerTab === "interval"
                  ? "bg-hyper-800 text-white shadow"
                  : "text-hyper-400 hover:text-white"
              }`}
            >
              <Repeat className="w-3 h-3" /> Interval
            </button>
            <button
              onClick={() => setTriggerTab("daily")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                triggerTab === "daily"
                  ? "bg-hyper-800 text-white shadow"
                  : "text-hyper-400 hover:text-white"
              }`}
            >
              <CalendarDays className="w-3 h-3" /> Daily
            </button>
            <button
              onClick={() => setTriggerTab("weekly")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                triggerTab === "weekly"
                  ? "bg-hyper-800 text-white shadow"
                  : "text-hyper-400 hover:text-white"
              }`}
            >
              <CalendarRange className="w-3 h-3" /> Weekly
            </button>
          </div>

          <div className="p-5 animate-fade-in">
            {triggerTab === "interval" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-hyper-400 mb-1.5 uppercase">
                      Run Every
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={intervalValue}
                        onChange={(e) =>
                          setIntervalValue(parseInt(e.target.value))
                        }
                        className="text-sm"
                      />
                      <Select
                        value={intervalUnit}
                        onChange={(e) => setIntervalUnit(e.target.value)}
                        className="text-sm"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                      </Select>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-hyper-500">
                  Workflow will execute every {intervalValue} {intervalUnit}.
                  Next run: in {intervalValue} {intervalUnit}.
                </p>
              </div>
            )}

            {triggerTab === "daily" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-hyper-400 mb-1.5 uppercase">
                    Time of Day (UTC)
                  </label>
                  <Input
                    type="time"
                    value={dailyTime}
                    onChange={(e) => setDailyTime(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <p className="text-[10px] text-hyper-500">
                  Workflow will execute once every day at {dailyTime} UTC.
                </p>
              </div>
            )}

            {triggerTab === "weekly" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-hyper-400 mb-2 uppercase">
                    On Days
                  </label>
                  <div className="flex justify-between gap-1">
                    {daysOfWeek.map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`
                          w-9 h-9 rounded-full text-xs font-bold transition-all
                          ${
                            weeklyDays.includes(day)
                              ? "bg-hyper-accent text-white shadow-lg shadow-hyper-accent/20 scale-105"
                              : "bg-hyper-950 border border-hyper-800 text-hyper-500 hover:border-hyper-600 hover:text-hyper-300"
                          }
                        `}
                      >
                        {day.charAt(0)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-hyper-400 mb-1.5 uppercase">
                    At Time (UTC)
                  </label>
                  <Input
                    type="time"
                    value={weeklyTime}
                    onChange={(e) => setWeeklyTime(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
