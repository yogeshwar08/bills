import React from 'react';
import { AlertCircle, FileQuestion, ArrowLeft, RefreshCw, Info } from 'lucide-react';
import { BillAnalysisResponse } from '../types';

interface NonBillRejectionViewProps {
  previewUrl: string;
  result: BillAnalysisResponse;
  onTryAnother: () => void;
  onRetry: () => void;
}

export const NonBillRejectionView: React.FC<NonBillRejectionViewProps> = ({
  previewUrl,
  result,
  onTryAnother,
  onRetry,
}) => {
  const nonBillType = result.non_bill_type || 'Non-financial image';

  return (
    <div className="max-w-md sm:max-w-xl mx-auto p-4 flex flex-col items-center justify-center min-h-[75vh]">
      <div className="w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5 text-center">
        {/* Rejection Badge & Image Preview */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 h-52 flex items-center justify-center">
          <img
            src={previewUrl}
            alt="Uploaded non-bill"
            className="h-52 w-full object-contain opacity-75"
          />
          <div className="absolute top-3 right-3 bg-rose-600 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-sm">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Not a Bill</span>
          </div>
        </div>

        {/* Rejection Title & Detected Type */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
            <FileQuestion className="w-3.5 h-3.5 text-amber-600" />
            <span>Detected: {nonBillType}</span>
          </div>
          <h3 className="font-bold text-slate-900 text-lg sm:text-xl">This doesn't appear to be a bill</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
            {result.reason || 'Please upload a genuine purchase receipt, retail invoice, or utility bill.'}
          </p>
        </div>

        {/* Helpful explanation box */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
          <div className="flex items-center space-x-1.5 font-semibold text-slate-800">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>What can Bill Snap analyze?</span>
          </div>
          <ul className="text-slate-600 space-y-1.5 pl-5 list-disc text-[11px] leading-relaxed">
            <li>Store, supermarket & restaurant purchase receipts</li>
            <li>Utility invoices (electricity, water, broadband, gas)</li>
            <li>Digital purchase receipts or payment confirmations <strong>(screenshots are fully supported!)</strong></li>
            <li>Tax invoices, courier slips & pharmacy bills</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700 bg-white hover:bg-slate-50 flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Retry</span>
          </button>
          <button
            type="button"
            onClick={onTryAnother}
            className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 font-semibold text-xs text-white hover:bg-indigo-700 flex items-center justify-center space-x-1.5 transition-colors shadow-sm shadow-indigo-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Upload Another</span>
          </button>
        </div>
      </div>
    </div>
  );
};

