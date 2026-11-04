import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  merchantName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  merchantName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <Trash2 className="w-6 h-6" />
        </div>

        <div className="text-center space-y-1.5">
          <h3 className="font-bold text-slate-900 text-base">Delete this bill?</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Are you sure you want to remove the bill from <strong className="text-slate-800 font-semibold">{merchantName}</strong>? This action cannot be undone.
          </p>
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-600 font-semibold text-xs text-white hover:bg-rose-700 shadow-sm shadow-rose-200 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
