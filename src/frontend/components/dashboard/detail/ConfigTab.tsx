import { Save } from "lucide-react";
import { ScheduleConfig } from "./ScheduleConfig";
import { Input, Select } from "@/components/ui/input";
import { useState } from "react";

export function ConfigTab() {
  const [scheduleEnabled, setScheduleEnabled] = useState(true);

  return (
    <div className="space-y-6">
      <ScheduleConfig
        scheduleEnabled={scheduleEnabled}
        onScheduleEnabledChange={setScheduleEnabled}
      />

      <div className="bg-hyper-900 border border-hyper-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">
          General Parameters
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-hyper-400 mb-1.5 uppercase">
              Max Execution Time (sec)
            </label>
            <Input type="number" defaultValue={30} className="text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-hyper-400 mb-1.5 uppercase">
              Retry Strategy
            </label>
            <Select className="text-sm">
              <option>None</option>
              <option>Linear Backoff</option>
              <option>Exponential Backoff</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <button className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-hyper-200 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-white/5">
          <Save className="w-4 h-4" /> Save Configuration
        </button>
      </div>
    </div>
  );
}
