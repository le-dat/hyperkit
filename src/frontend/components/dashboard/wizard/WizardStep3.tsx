import { X, Upload, FileText } from "lucide-react";

interface WizardStep3Props {
  knowledgeFiles: string[];
  onAddFile: (filename: string) => void;
  onRemoveFile: (filename: string) => void;
}

export function WizardStep3({
  knowledgeFiles,
  onAddFile,
  onRemoveFile,
}: WizardStep3Props) {
  return (
    <div className="animate-slide-up h-full flex flex-col">
      <div className="flex-1 border-2 border-dashed border-hyper-700 rounded-xl bg-hyper-900/20 hover:bg-hyper-900/40 transition-colors flex flex-col items-center justify-center cursor-pointer group mb-6">
        <div className="w-16 h-16 bg-hyper-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Upload className="w-8 h-8 text-hyper-400 group-hover:text-white" />
        </div>
        <h3 className="text-lg font-bold text-white">Drop Context Files</h3>
        <p className="text-sm text-hyper-500 mt-2 text-center max-w-xs">
          Upload PDF, JSON, or MD files to give your agent specific knowledge.
        </p>
      </div>

      {knowledgeFiles.length > 0 && (
        <div className="space-y-2 mb-4">
          {knowledgeFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-hyper-900 rounded-lg border border-hyper-800"
            >
              <span className="text-sm text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-hyper-400" />
                {file}
              </span>
              <button
                onClick={() => onRemoveFile(file)}
                className="text-hyper-500 hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mock Add File Button */}
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => onAddFile("api_docs_v2.pdf")}
          className="text-xs bg-hyper-800 hover:bg-hyper-700 text-white px-3 py-1 rounded-full border border-hyper-700 transition-colors"
        >
          + Add Mock PDF
        </button>
        <button
          onClick={() => onAddFile("context.json")}
          className="text-xs bg-hyper-800 hover:bg-hyper-700 text-white px-3 py-1 rounded-full border border-hyper-700 transition-colors"
        >
          + Add Mock JSON
        </button>
      </div>
    </div>
  );
}
