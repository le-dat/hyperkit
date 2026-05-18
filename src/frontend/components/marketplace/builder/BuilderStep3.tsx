import { CheckCircle2, Globe } from "lucide-react";

interface BuilderStep3Props {
  name: string;
  endpoint: string;
}

export function BuilderStep3({ name, endpoint }: BuilderStep3Props) {
  return (
    <div className="max-w-2xl mx-auto text-center space-y-8 animate-slide-up">
      <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </div>

      <h3 className="text-2xl font-bold text-white">Ready to Publish?</h3>
      <p className="text-hyper-400">
        Your tool{" "}
        <span className="text-white font-bold">&quot;{name}&quot;</span> will be
        available in the marketplace for other users to install.
      </p>

      <div className="bg-hyper-900 border border-hyper-800 rounded-xl p-6 text-left space-y-3">
        <div className="flex justify-between border-b border-hyper-800 pb-2">
          <span className="text-hyper-500 text-sm">Visibility</span>
          <span className="text-white text-sm font-medium flex items-center gap-2">
            <Globe className="w-3 h-3" /> Public Marketplace
          </span>
        </div>
        <div className="flex justify-between border-b border-hyper-800 pb-2">
          <span className="text-hyper-500 text-sm">Endpoint</span>
          <span className="text-white text-sm font-medium truncate max-w-[200px]">
            {endpoint || "https://..."}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-hyper-500 text-sm">Functions</span>
          <span className="text-white text-sm font-medium">1 Detected</span>
        </div>
      </div>
    </div>
  );
}
