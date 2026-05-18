"use client";

import { useState, useEffect, startTransition } from "react";
import { X } from "lucide-react";
import { WizardProgress } from "./wizard/WizardProgress";
import { WizardStep1 } from "./wizard/WizardStep1";
import { WizardStep2 } from "./wizard/WizardStep2";
import { WizardStep3 } from "./wizard/WizardStep3";
import { WizardFooter } from "./wizard/WizardFooter";

interface CreateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (prompt: string, name: string) => void;
}

// Mock analyze function
const analyzeWorkflowRequest = async (prompt: string): Promise<string[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Return mock analysis steps
  return [
    "Trigger: Identify start condition",
    "Action: Connect necessary MCP tools",
    "Logic: Apply conditional routing",
    "Notification: Send results",
  ];
};

export function CreateWizard({
  isOpen,
  onClose,
  onComplete,
}: CreateWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState<string[]>([]);
  const [knowledgeFiles, setKnowledgeFiles] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      startTransition(() => {
        setStep(1);
        setName("");
        setPrompt("");
        setAnalysisSteps([]);
        setKnowledgeFiles([]);
      });
    }
  }, [isOpen]);

  const handleNext = async () => {
    if (step === 1) {
      if (!name || !prompt) return;
      setStep(2);
      setIsAnalyzing(true);
      // Simulate/Call AI analysis
      const steps = await analyzeWorkflowRequest(prompt);
      setAnalysisSteps(steps);
      setIsAnalyzing(false);
    } else if (step === 2) {
      setStep(3);
    } else {
      onComplete(prompt, name);
    }
  };

  if (!isOpen) return null;

  const stepTitles = {
    1: "Workflow Details",
    2: "AI Analysis Plan",
    3: "Knowledge Base",
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="bg-hyper-950 border border-hyper-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col h-[600px] overflow-hidden relative">
        <WizardProgress currentStep={step} totalSteps={3} />

        <div className="flex items-center justify-between p-8 border-b border-hyper-800">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-hyper-800 text-sm border border-hyper-700 font-mono">
                {step}/3
              </span>
              {stepTitles[step as keyof typeof stepTitles]}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-hyper-800 rounded-lg text-hyper-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto">
          {step === 1 && (
            <WizardStep1
              name={name}
              prompt={prompt}
              onNameChange={setName}
              onPromptChange={setPrompt}
            />
          )}
          {step === 2 && (
            <WizardStep2
              isAnalyzing={isAnalyzing}
              analysisSteps={analysisSteps}
            />
          )}
          {step === 3 && (
            <WizardStep3
              knowledgeFiles={knowledgeFiles}
              onAddFile={(file) => setKnowledgeFiles((prev) => [...prev, file])}
              onRemoveFile={(file) =>
                setKnowledgeFiles((prev) => prev.filter((f) => f !== file))
              }
            />
          )}
        </div>

        <WizardFooter
          currentStep={step}
          totalSteps={3}
          canGoNext={step === 1 ? !!(name && prompt) : true}
          onBack={() => setStep((prev) => Math.max(1, prev - 1))}
          onNext={handleNext}
        />
      </div>
    </div>
  );
}
