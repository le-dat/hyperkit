import { Brain } from "lucide-react";

interface WizardStep2Props {
  isAnalyzing: boolean;
  analysisSteps: string[];
}

export function WizardStep2({ isAnalyzing, analysisSteps }: WizardStep2Props) {
  if (isAnalyzing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full border-4 border-hyper-accent border-t-transparent animate-spin"></div>
        <h3 className="text-xl font-bold text-white">Analyzing Request...</h3>
        <p className="text-hyper-400">
          Deconstructing prompt into logic gates and MCP calls.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="p-4 bg-hyper-900/50 rounded-xl border border-hyper-800 mb-6">
        <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
          <Brain className="w-4 h-4 text-hyper-accent" />
          Execution Plan
        </h4>
        <div className="space-y-3">
          {analysisSteps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-hyper-800 border border-hyper-600 flex items-center justify-center text-xs font-bold text-white">
                  {i + 1}
                </div>
                {i < analysisSteps.length - 1 && (
                  <div className="w-px h-full bg-hyper-800 my-1"></div>
                )}
              </div>
              <p className="text-sm text-hyper-200 py-0.5">{step}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="text-sm text-hyper-500 text-center">
        Does this plan look correct? Click Next to attach knowledge files.
      </p>
    </div>
  );
}
