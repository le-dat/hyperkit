import { Input, Textarea } from "@/components/ui/input";

interface WizardStep1Props {
  name: string;
  prompt: string;
  onNameChange: (name: string) => void;
  onPromptChange: (prompt: string) => void;
}

export function WizardStep1({
  name,
  prompt,
  onNameChange,
  onPromptChange,
}: WizardStep1Props) {
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="space-y-2">
        <label className="text-sm font-medium text-hyper-300">Agent Name</label>
        <Input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. DeFi Yield Optimizer"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-hyper-300">
          Describe the Logic
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe what you want the agent to do. Be specific about triggers, conditions, and actions."
          className="h-40"
        />
      </div>
    </div>
  );
}
