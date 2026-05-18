"use client";

import { useState } from "react";
import { X, ArrowRight, Box, Cloud } from "lucide-react";
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
} from "@/components/ui/modal";
import { BuilderSteps } from "./builder/BuilderSteps";
import { BuilderStep1 } from "./builder/BuilderStep1";
import { BuilderStep2 } from "./builder/BuilderStep2";
import { BuilderStep3 } from "./builder/BuilderStep3";

interface MCPBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (tool: {
    name: string;
    description: string;
    category: string;
    endpoint?: string;
    authType?: string;
    schema?: string;
  }) => void;
}

export function MCPBuilder({ isOpen, onClose, onPublish }: MCPBuilderProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Productivity",
    endpoint: "",
    authType: "none",
    schema:
      '{\n  "functions": [\n    {\n      "name": "my_function",\n      "description": "Does something useful",\n      "parameters": {}\n    }\n  ]\n}',
  });

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => prev - 1);

  const handlePublish = () => {
    onPublish(formData);
    setStep(1);
    setFormData({
      name: "",
      description: "",
      category: "Productivity",
      endpoint: "",
      authType: "none",
      schema:
        '{\n  "functions": [\n    {\n      "name": "my_function",\n      "description": "Does something useful",\n      "parameters": {}\n    }\n  ]\n}',
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      className="h-[650px] flex flex-col"
    >
      <ModalHeader
        title={
          <div className="flex items-center gap-2">
            <Box className="w-6 h-6 text-hyper-accent" />
            MCP Tool Builder
          </div>
        }
        description="Create a custom tool and publish it to the marketplace."
      />

      <BuilderSteps currentStep={step} totalSteps={3} />

      <ModalContent className="flex-1 overflow-y-auto p-8 bg-hyper-950">
        {step === 1 && (
          <BuilderStep1
            name={formData.name}
            description={formData.description}
            category={formData.category}
            onNameChange={(name) => setFormData({ ...formData, name })}
            onDescriptionChange={(description) =>
              setFormData({ ...formData, description })
            }
            onCategoryChange={(category) =>
              setFormData({ ...formData, category })
            }
          />
        )}
        {step === 2 && (
          <BuilderStep2
            endpoint={formData.endpoint}
            authType={formData.authType}
            schema={formData.schema}
            onEndpointChange={(endpoint) =>
              setFormData({ ...formData, endpoint })
            }
            onAuthTypeChange={(authType) =>
              setFormData({ ...formData, authType })
            }
            onSchemaChange={(schema) => setFormData({ ...formData, schema })}
          />
        )}
        {step === 3 && (
          <BuilderStep3 name={formData.name} endpoint={formData.endpoint} />
        )}
      </ModalContent>

      <ModalFooter className="justify-between">
        {step > 1 ? (
          <button
            onClick={handleBack}
            className="px-6 py-2.5 rounded-xl font-medium text-hyper-400 hover:text-white hover:bg-hyper-800 transition-colors"
          >
            Back
          </button>
        ) : (
          <div></div>
        )}

        {step < 3 ? (
          <button
            onClick={handleNext}
            disabled={!formData.name}
            className="bg-white text-black px-6 py-2.5 rounded-xl font-bold hover:bg-hyper-200 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handlePublish}
            className="bg-hyper-accent text-white px-8 py-2.5 rounded-xl font-bold hover:bg-hyper-accentHover transition-colors shadow-lg shadow-hyper-accent/20 flex items-center gap-2"
          >
            <Cloud className="w-4 h-4" /> Publish to Marketplace
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
}
