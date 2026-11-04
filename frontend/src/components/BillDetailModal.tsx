import React from 'react';
import { X, Trash2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { SavedBill } from '../types';
import { getConfidenceBadgeProps } from '../utils/confidence';

interface BillDetailModalProps {
  bill: SavedBill | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteRequest: (bill: SavedBill) => void;
}

export const BillDetailModal: React.FC<BillDetailModalProps> = ({
  bill,
  isOpen,
  onClose,
  onDeleteRequest,
}) => {
  if (!isOpen || !bill) return null;

  const orig = bill.originalExtracted;
  const hasCorrections = bill.userCorrected && bill.userCorrectedFields.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-lg truncate max-w-[260px]">
              {bill.merchantName}
            </h3>
            <p className="text-[11px] text-slate-400">ID: {bill.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-5">
          {/* Thumbnail preview if available */}
          {bill.thumbnailBase64 && (
            <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 h-44 flex items-center justify-center">
              <img
                src={bill.thumbnailBase64}
                alt={bill.merchantName}
                className="h-44 w-full object-contain"
              />
            </div>
          )}

          {/* Active summary banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Total Paid</div>
              <div className="text-2xl font-black text-indigo-950 tracking-tight">
                {bill.currency === 'INR' ? '₹' : bill.currency} {bill.amount.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-xs">
                {bill.category}
              </span>
              <div className="text-[11px] text-indigo-800/80 font-medium mt-1">
                {bill.date}
              </div>
            </div>
          </div>

          {/* User Corrections Summary */}
          {hasCorrections ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>User Corrections Applied</span>
              </div>
              <p className="text-[11px] text-amber-700">
                Corrected fields: {bill.userCorrectedFields.join(', ')}
              </p>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Saved exactly as extracted by AI without modifications.</span>
            </div>
          )}

          {/* Original AI Extraction Details */}
          <div className="space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Original AI Extraction Audit</span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Merchant audit */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Merchant</span>
                <div className="text-right flex items-center space-x-2">
                  <span className="font-semibold text-slate-800">{orig.merchantName || '—'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getConfidenceBadgeProps(orig.merchantConfidence).badgeClasses}`}>
                    {Math.round(orig.merchantConfidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Amount audit */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Total Amount</span>
                <div className="text-right flex items-center space-x-2">
                  <span className="font-semibold text-slate-800">
                    {orig.amount !== null ? `${orig.currency} ${orig.amount}` : '—'}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getConfidenceBadgeProps(orig.amountConfidence).badgeClasses}`}>
                    {Math.round(orig.amountConfidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Date audit */}
              <div className="flex items-center justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Date</span>
                <div className="text-right flex items-center space-x-2">
                  <span className="font-semibold text-slate-800">{orig.date || '—'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getConfidenceBadgeProps(orig.dateConfidence).badgeClasses}`}>
                    {Math.round(orig.dateConfidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Category audit */}
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Category</span>
                <div className="text-right flex items-center space-x-2">
                  <span className="font-semibold text-slate-800">{orig.category || '—'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getConfidenceBadgeProps(orig.categoryConfidence).badgeClasses}`}>
                    {Math.round(orig.categoryConfidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes if present */}
          {bill.notes && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Notes</span>
              <span className="text-slate-700 font-medium">{bill.notes}</span>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-[11px] text-slate-400 text-center">
            Saved on {new Date(bill.createdAt).toLocaleString()}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center space-x-3">
          <button
            type="button"
            onClick={() => onDeleteRequest(bill)}
            className="flex-1 py-3 px-4 rounded-xl border border-rose-200 font-semibold text-xs text-rose-600 bg-rose-50/50 hover:bg-rose-100/70 flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Bill</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 font-semibold text-xs text-white hover:bg-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
