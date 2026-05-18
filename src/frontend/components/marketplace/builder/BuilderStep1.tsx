import { Input, Textarea, Select } from "@/components/ui/input";

interface BuilderStep1Props {
  name: string;
  description: string;
  category: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onCategoryChange: (category: string) => void;
}

export function BuilderStep1({
  name,
  description,
  category,
  onNameChange,
  onDescriptionChange,
  onCategoryChange,
}: BuilderStep1Props) {
  return (
    <div className="max-w-xl mx-auto space-y-6 animate-slide-up">
      <div className="space-y-2">
        <label className="text-sm font-bold text-white uppercase tracking-wider">
          Tool Name
        </label>
        <Input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Weather Service Pro"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-white uppercase tracking-wider">
          Description
        </label>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="What does this tool do?"
          className="h-32"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-bold text-white uppercase tracking-wider">
          Category
        </label>
        <Select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option>Productivity</option>
          <option>DeFi / Crypto</option>
          <option>Developer Tools</option>
          <option>Data Analysis</option>
          <option>Communication</option>
        </Select>
      </div>
    </div>
  );
}
