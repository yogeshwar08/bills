import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Camera,
  Image as ImageIcon,
  ReceiptText,
  ArrowUpRight,
  TrendingUp,
  History,
  Sparkles,
  ShieldCheck,
  Calendar,
  Coins
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../database/db';
import { SavedBill } from '../types';
import { BillDetailModal } from '../components/BillDetailModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface HomePageProps {
  onOpenUpload: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenUpload }) => {
  // Real live query from IndexedDB
  const bills = useLiveQuery(() => db.bills.orderBy('createdAt').reverse().toArray(), []);

  const [selectedBill, setSelectedBill] = useState<SavedBill | null>(null);
  const [billToDelete, setBillToDelete] = useState<SavedBill | null>(null);

  // Accurate aggregate statistics calculated dynamically from IndexedDB records
  const totalBills = bills?.length ?? 0;
  const totalSpending = useMemo(() => {
    return bills?.reduce((acc, b) => acc + (b.amount || 0), 0) ?? 0;
  }, [bills]);

  // Current month spending
  const currentMonthPrefix = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const currentMonthSpending = useMemo(() => {
    if (!bills) return 0;
    return bills
      .filter((b) => b.date && b.date.startsWith(currentMonthPrefix))
      .reduce((acc, b) => acc + (b.amount || 0), 0);
  }, [bills, currentMonthPrefix]);

  const averageBill = useMemo(() => {
    return totalBills > 0 ? totalSpending / totalBills : 0;
  }, [totalBills, totalSpending]);

  const recentBills = useMemo(() => {
    return bills?.slice(0, 5) ?? [];
  }, [bills]);

  const handleDeleteConfirmed = async () => {
    if (billToDelete) {
      await db.bills.delete(billToDelete.id);
      setBillToDelete(null);
      setSelectedBill(null);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Hero Financial Action Card */}
      <section className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-200/50 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-semibold text-indigo-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI Multimodal Vision</span>
          </div>
          <span className="text-[11px] text-indigo-100/90 font-medium flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 inline" />
            <span>On-Device Storage • In-Memory AI Processing</span>
          </span>
        </div>

        <div className="md:flex md:items-center md:justify-between md:gap-8">
          <div className="md:max-w-md space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Snap your bills.<br />Organize in seconds.
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              Automatic merchant detection, spending categories, and confidence verification powered by Gemini Vision.
            </p>
          </div>

          {/* Quick Launch Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4 md:pt-0 shrink-0 md:w-80">
            <button
              type="button"
              onClick={onOpenUpload}
              className="py-4 px-4 rounded-2xl bg-white text-indigo-950 font-bold text-xs flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 shadow-sm hover:bg-indigo-50 active:scale-[0.98] transition-all touch-manipulation cursor-pointer"
            >
              <Camera className="w-5 h-5 text-indigo-600" />
              <span>Take Photo</span>
            </button>
            <button
              type="button"
              onClick={onOpenUpload}
              className="py-4 px-4 rounded-2xl bg-indigo-500/30 hover:bg-indigo-500/40 text-white font-bold text-xs border border-white/20 flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 active:scale-[0.98] transition-all touch-manipulation cursor-pointer"
            >
              <ImageIcon className="w-5 h-5 text-indigo-200" />
              <span>Upload Gallery</span>
            </button>
          </div>
        </div>
      </section>

      {/* Aggregate Statistics - 100% computed from real IndexedDB records */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Saved</span>
            <ReceiptText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{totalBills}</div>
          <p className="text-[11px] text-slate-500">IndexedDB local records</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Spending</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{totalSpending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">All recorded expenditures</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">This Month</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{currentMonthSpending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">Current calendar month</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Average Bill</span>
            <Coins className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{averageBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">Per transaction average</p>
        </div>
      </section>

      {/* Recent Bills Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center space-x-1.5">
            <History className="w-4 h-4 text-slate-500" />
            <span>Recent Bills</span>
          </h3>
          {totalBills > 0 && (
            <Link to="/history" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center">
              <span>View all ({totalBills})</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          )}
        </div>

        {totalBills === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <ReceiptText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-800 text-sm">No bills saved yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Photograph a store receipt or select a digital invoice from your gallery. Gemini Vision will automatically extract and categorize your expense.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center space-x-1.5 py-3 px-5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Scan First Bill</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentBills.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedBill(b)}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-indigo-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                    {b.thumbnailBase64 ? (
                      <img src={b.thumbnailBase64} alt={b.merchantName} className="w-full h-full object-cover" />
                    ) : (
                      <ReceiptText className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-sm truncate">{b.merchantName}</div>
                    <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                      <span className="font-medium text-indigo-600">{b.category}</span>
                      <span>•</span>
                      <span>{b.date}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-extrabold text-slate-900 text-sm">
                    {b.currency === 'INR' ? '₹' : b.currency} {b.amount.toFixed(2)}
                  </div>
                  {b.userCorrected && (
                    <span className="text-[10px] text-amber-600 font-medium">User Corrected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Transparent Privacy & Data Guarantee Card */}
      <section className="bg-slate-100/80 rounded-2xl p-4 border border-slate-200/80 text-xs space-y-1.5">
        <div className="font-bold text-slate-800 flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Transparent Data Privacy & Storage Architecture</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Your saved bills and financial metrics reside strictly on this device inside <strong>IndexedDB</strong>.
          When analyzing a bill, the image is transmitted in-memory to the configured <strong>Google Gemini Vision API</strong> for structured extraction and is never retained permanently on our backend.
        </p>
      </section>

      {/* Bill Detail Modal */}
      <BillDetailModal
        bill={selectedBill}
        isOpen={Boolean(selectedBill)}
        onClose={() => setSelectedBill(null)}
        onDeleteRequest={(b) => setBillToDelete(b)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(billToDelete)}
        merchantName={billToDelete?.merchantName ?? ''}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setBillToDelete(null)}
      />
    </div>
  );
};
