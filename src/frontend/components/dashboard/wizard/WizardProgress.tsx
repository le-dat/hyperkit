import { ProgressBar } from "@/components/ui/progress-bar";

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function WizardProgress({
  currentStep,
  totalSteps,
}: WizardProgressProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="h-1 bg-hyper-900 w-full">
      <ProgressBar value={progress} variant="accent" />
    </div>
  );
}
