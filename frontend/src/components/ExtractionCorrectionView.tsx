import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  Tag, 
  AlertCircle, 
  HelpCircle, 
  Save, 
  ArrowLeft,
  Sparkles,
  Info,
  Globe
} from 'lucide-react';
import { BillAnalysisResponse, BillCategory, SavedBill } from '../types';
import { getConfidenceBadgeProps } from '../utils/confidence';
import { db } from '../database/db';

interface ExtractionCorrectionViewProps {
  previewUrl: string;
  result: BillAnalysisResponse;
  thumbnailBase64?: string;
  onSaveSuccess: (savedBill: SavedBill) => void;
  onCancel: () => void;
}

const CATEGORIES: BillCategory[] = [
  'Food',
  'Groceries',
  'Utilities',
  'Shopping',
  'Transportation',
  'Healthcare',
  'Entertainment',
  'Education',
  'Other'
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'AED'];

export const ExtractionCorrectionView: React.FC<ExtractionCorrectionViewProps> = ({
  previewUrl,
  result,
  thumbnailBase64,
  onSaveSuccess,
  onCancel,
}) => {
  const fields = result.fields;

  // Initial extracted states
  const origMerchant = fields?.merchant_name.value ?? '';
  const origDate = fields?.date.value ?? new Date().toISOString().split('T')[0];
  const origAmount = fields?.total_amount.value !== null && fields?.total_amount.value !== undefined 
    ? String(fields.total_amount.value) 
    : '';
  const origCategory: BillCategory = (fields?.category.value as BillCategory) || 'Other';
  const origCurrency = fields?.currency || 'INR';

  // User editable states
  const [merchantName, setMerchantName] = useState<string>(origMerchant);
  const [date, setDate] = useState<string>(origDate);
  const [amount, setAmount] = useState<string>(origAmount);
  const [currency, setCurrency] = useState<string>(origCurrency);
  const [category, setCategory] = useState<BillCategory>(origCategory);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Field confidence badges
  const merchantConf = getConfidenceBadgeProps(fields?.merchant_name.confidence ?? 0.5);
  const dateConf = getConfidenceBadgeProps(fields?.date.confidence ?? 0.5);
  const amountConf = getConfidenceBadgeProps(fields?.total_amount.confidence ?? 0.5);
  const categoryConf = getConfidenceBadgeProps(fields?.category.confidence ?? 0.5);

  const handleSave = async () => {
    setValidationError(null);

    // Validation
    if (!merchantName.trim()) {
      setValidationError('Please specify the merchant or store name.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setValidationError('Please enter a valid positive total amount.');
      return;
    }

    if (!date) {
      setValidationError('Please specify the transaction date.');
      return;
    }

    setIsSaving(true);

    try {
      // Determine which fields were corrected by user
      const correctedFields: string[] = [];
      if (merchantName.trim() !== origMerchant.trim()) correctedFields.push('merchantName');
      if (date !== origDate) correctedFields.push('date');
      if (parsedAmount !== (fields?.total_amount.value ?? 0)) correctedFields.push('amount');
      if (category !== origCategory) correctedFields.push('category');
      if (currency !== origCurrency) correctedFields.push('currency');

      const savedBill: SavedBill = {
        id: `bill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        merchantName: merchantName.trim(),
        date,
        amount: parsedAmount,
        currency,
        category,
        createdAt: new Date().toISOString(),
        thumbnailBase64: thumbnailBase64 || previewUrl,
        userCorrected: correctedFields.length > 0,
        userCorrectedFields: correctedFields,
        originalExtracted: {
          merchantName: origMerchant || null,
          merchantConfidence: fields?.merchant_name.confidence ?? 0,
          merchantReason: fields?.merchant_name.reason ?? null,
          date: origDate || null,
          dateConfidence: fields?.date.confidence ?? 0,
          dateReason: fields?.date.reason ?? null,
          amount: fields?.total_amount.value ?? null,
          amountConfidence: fields?.total_amount.confidence ?? 0,
          amountReason: fields?.total_amount.reason ?? null,
          category: origCategory || null,
          categoryConfidence: fields?.category.confidence ?? 0,
          categoryReason: fields?.category.reason ?? null,
          currency: origCurrency,
          classificationConfidence: result.classification_confidence,
        },
        notes: notes.trim() || undefined
      };

      await db.bills.add(savedBill);
      onSaveSuccess(savedBill);
    } catch (err: any) {
      console.error('Failed to save bill to IndexedDB:', err);
      setValidationError('Failed to persist bill locally. Please check your storage settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto space-y-5 pb-24">
      {/* Top Banner & Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onCancel}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Vision Verified</span>
        </div>
      </div>

      {/* Bill Preview Card with expandable details */}
      <div className="rounded-2xl overflow-hidden bg-white border border-slate-200/90 shadow-xs p-3.5 sm:p-4">
        <div className="flex space-x-3.5 items-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0">
            <img src={previewUrl} alt="Receipt thumbnail" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Classification</div>
            <div className="text-sm sm:text-base font-bold text-slate-900 truncate">Genuine Bill Verified</div>
            <div className="text-xs text-slate-600 line-clamp-2 mt-1">{result.reason}</div>
          </div>
        </div>
      </div>

      {/* Statistical Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-100/90 border border-slate-200/80 flex items-start space-x-2 text-[11px] text-slate-600 leading-relaxed">
        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
        <p>
          Confidence scores are model heuristic estimates, not calibrated statistical probabilities. Please review and adjust any field below before saving.
        </p>
      </div>

      {validationError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Editable Fields Form */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        
        {/* 1. Merchant Name */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Merchant / Store Name</span>
            </label>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${merchantConf.badgeClasses}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${merchantConf.dotClasses} mr-1`}></span>
              {merchantConf.label}
            </span>
          </div>
          <input
            type="text"
            value={merchantName}
            onChange={(e) => setMerchantName(e.target.value)}
            placeholder="e.g. Starbucks, Walmart, Apollo"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden transition-all ${
              merchantConf.level === 'low'
                ? 'border-rose-300 bg-rose-50/20'
                : 'border-slate-200 bg-slate-50/50 focus:bg-white'
            }`}
          />
          {fields?.merchant_name.reason && (
            <div className={`text-[11px] px-2.5 py-1.5 rounded-lg border flex items-start space-x-1.5 ${
              merchantConf.level === 'low' 
                ? 'bg-rose-50 text-rose-800 border-rose-200' 
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              <HelpCircle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{fields.merchant_name.reason}</span>
            </div>
          )}
        </div>

        {/* 2. Total Amount & Currency Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                <span>Total Amount</span>
              </label>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${amountConf.badgeClasses}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${amountConf.dotClasses} mr-1`}></span>
                {amountConf.label}
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-sm font-bold">
                {currency === 'INR' ? '₹' : currency}
              </div>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full pl-9 pr-3.5 py-2.5 rounded-xl border text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden transition-all ${
                  amountConf.level === 'low'
                    ? 'border-rose-300 bg-rose-50/20'
                    : 'border-slate-200 bg-slate-50/50 focus:bg-white'
                }`}
              />
            </div>
            {fields?.total_amount.reason && (
              <div className={`text-[11px] px-2.5 py-1.5 rounded-lg border flex items-start space-x-1.5 ${
                amountConf.level === 'low' 
                  ? 'bg-rose-50 text-rose-800 border-rose-200' 
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                <HelpCircle className="w-3 h-3 shrink-0 mt-0.5" />
                <span>{fields.total_amount.reason}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Currency</span>
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden transition-all cursor-pointer"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c} {c === 'INR' ? '(₹)' : c === 'USD' ? '($)' : c === 'EUR' ? '(€)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Bill Date */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Transaction Date</span>
            </label>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${dateConf.badgeClasses}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dateConf.dotClasses} mr-1`}></span>
              {dateConf.label}
            </span>
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden transition-all ${
              dateConf.level === 'low'
                ? 'border-rose-300 bg-rose-50/20'
                : 'border-slate-200 bg-slate-50/50 focus:bg-white'
            }`}
          />
          {fields?.date.reason && (
            <div className={`text-[11px] px-2.5 py-1.5 rounded-lg border flex items-start space-x-1.5 ${
              dateConf.level === 'low' 
                ? 'bg-rose-50 text-rose-800 border-rose-200' 
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              <HelpCircle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{fields.date.reason}</span>
            </div>
          )}
        </div>

        {/* 4. Category */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Suggested Category</span>
            </label>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${categoryConf.badgeClasses}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${categoryConf.dotClasses} mr-1`}></span>
              {categoryConf.label}
            </span>
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as BillCategory)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50 focus:bg-white transition-all cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {fields?.category.reason && (
            <div className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 flex items-start space-x-1.5">
              <HelpCircle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
              <span>{fields.category.reason}</span>
            </div>
          )}
        </div>

        {/* Optional Notes */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-slate-700">Optional Notes / Tag</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Office lunch, Client reimbursement"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md shadow-indigo-200 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Saving to Local Database...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Verified Bill Locally</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
