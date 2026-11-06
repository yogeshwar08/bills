import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleDashed, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';
import { ApiError } from '../services/api';

interface AnalysisLoadingViewProps {
  previewUrl: string;
  error: ApiError | Error | null;
  onRetry: () => void;
  onCancel: () => void;
}

interface Stage {
  id: number;
  label: string;
  description: string;
}

const STAGES: Stage[] = [
  { id: 1, label: 'Checking image', description: 'Inspecting resolution, lighting, and EXIF orientation' },
  { id: 2, label: 'Identifying bill', description: 'Multimodal AI verifying commercial transaction indicators' },
  { id: 3, label: 'Extracting information', description: 'Extracting merchant, date, total amount, and category' },
  { id: 4, label: 'Preparing results', description: 'Formatting confidence scores and validation reasons' }
];

export const AnalysisLoadingView: React.FC<AnalysisLoadingViewProps> = ({
  previewUrl,
  error,
  onRetry,
  onCancel
}) => {
  const [currentStage, setCurrentStage] = useState<number>(1);

  useEffect(() => {
    if (error) return;

    // Advance stages smoothly to match fast 2-3s AI extraction
    const t1 = setTimeout(() => setCurrentStage(2), 700);
    const t2 = setTimeout(() => setCurrentStage(3), 1500);
    const t3 = setTimeout(() => setCurrentStage(4), 2300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [error]);

  return (
    <div className="max-w-md sm:max-w-xl mx-auto p-4 flex flex-col items-center justify-center min-h-[75vh]">
      <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        {/* Thumbnail Preview */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 h-52 flex items-center justify-center">
          <img
            src={previewUrl}
            alt="Analyzing bill"
            className={`h-52 w-full object-contain ${!error ? 'opacity-85 filter blur-[0.5px] transition-all' : ''}`}
          />
          {!error && (
            <div className="absolute inset-0 bg-indigo-900/10 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-3 border-indigo-500 border-t-white animate-spin"></div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold">Analysis Failed</div>
                <div className="text-rose-700 leading-relaxed">{error.message}</div>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700 bg-white hover:bg-slate-50 flex items-center justify-center space-x-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4 text-slate-500" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={onRetry}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 font-semibold text-xs text-white hover:bg-indigo-700 flex items-center justify-center space-x-1.5 transition-colors shadow-sm shadow-indigo-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Analysis</span>
              </button>
            </div>
          </div>
        ) : (
          /* Realistic Stage Progress */
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Analyzing Bill with AI</h3>
              <p className="text-xs text-slate-500">Google Gemini Multimodal Vision</p>
            </div>

            <div className="space-y-3 pt-2">
              {STAGES.map((stage) => {
                const isPassed = currentStage > stage.id;
                const isCurrent = currentStage === stage.id;

                return (
                  <div
                    key={stage.id}
                    className={`flex items-start space-x-3 p-2.5 rounded-xl transition-all ${
                      isCurrent
                        ? 'bg-indigo-50/80 border border-indigo-100'
                        : isPassed
                        ? 'opacity-80'
                        : 'opacity-40'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isCurrent ? (
                        <CircleDashed className="w-4 h-4 text-indigo-600 animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300"></div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className={`text-xs font-semibold ${isCurrent ? 'text-indigo-950' : 'text-slate-800'}`}>
                        {stage.label}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-tight">
                        {stage.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Cancel analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

