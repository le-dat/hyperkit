import { ArrowRight, Sparkles } from "lucide-react";

interface WizardFooterProps {
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}

export function WizardFooter({
  currentStep,
  totalSteps,
  canGoNext,
  onBack,
  onNext,
  nextLabel,
}: WizardFooterProps) {
  const isLastStep = currentStep === totalSteps;
  const isFirstStep = currentStep === 1;

  return (
    <div className="p-6 border-t border-hyper-800 bg-hyper-900 flex justify-between items-center">
      <button
        onClick={onBack}
        disabled={isFirstStep}
        className="px-6 py-3 rounded-xl font-medium text-hyper-400 hover:text-white hover:bg-hyper-800 disabled:opacity-0 disabled:pointer-events-none transition-all"
      >
        Back
      </button>

      <button
        onClick={onNext}
        disabled={!canGoNext}
        className="bg-hyper-accent hover:bg-hyper-accentHover text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isLastStep ? (
          <>
            <Sparkles className="w-5 h-5" /> Build Agent
          </>
        ) : (
          <>
            {nextLabel || "Next Step"} <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </div>
  );
}
