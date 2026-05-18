interface BuilderStepsProps {
  currentStep: number;
  totalSteps: number;
}

export function BuilderSteps({ currentStep, totalSteps }: BuilderStepsProps) {
  const stepLabels = {
    1: "Basic Info",
    2: "Connection & Schema",
    3: "Review & Publish",
  };

  return (
    <div className="flex border-b border-hyper-800 bg-hyper-950/50">
      {[1, 2, 3].map((step) => (
        <div
          key={step}
          className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium ${
            currentStep === step
              ? "text-hyper-accent border-b-2 border-hyper-accent"
              : "text-hyper-500"
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${
              currentStep === step
                ? "bg-hyper-accent text-white border-hyper-accent"
                : "bg-hyper-900 border-hyper-700"
            }`}
          >
            {step}
          </div>
          {stepLabels[step as keyof typeof stepLabels]}
        </div>
      ))}
    </div>
  );
}
