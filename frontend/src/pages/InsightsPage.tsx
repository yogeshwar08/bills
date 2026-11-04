import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { PieChart, TrendingUp, Sparkles, ChevronDown } from 'lucide-react';
import { db } from '../database/db';
import { BillCategory } from '../types';

interface CategorySpend {
  category: BillCategory;
  total: number;
  count: number;
  percentage: number;
  color: string;
}

const CATEGORY_COLORS: Record<BillCategory, string> = {
  Food: 'bg-orange-500 text-orange-700 bg-orange-50',
  Groceries: 'bg-emerald-500 text-emerald-700 bg-emerald-50',
  Utilities: 'bg-blue-500 text-blue-700 bg-blue-50',
  Shopping: 'bg-purple-500 text-purple-700 bg-purple-50',
  Transportation: 'bg-amber-500 text-amber-700 bg-amber-50',
  Healthcare: 'bg-rose-500 text-rose-700 bg-rose-50',
  Entertainment: 'bg-pink-500 text-pink-700 bg-pink-50',
  Education: 'bg-cyan-500 text-cyan-700 bg-cyan-50',
  Other: 'bg-slate-500 text-slate-700 bg-slate-50'
};

const BAR_COLORS: Record<BillCategory, string> = {
  Food: 'bg-orange-500',
  Groceries: 'bg-emerald-500',
  Utilities: 'bg-blue-500',
  Shopping: 'bg-purple-500',
  Transportation: 'bg-amber-500',
  Healthcare: 'bg-rose-500',
  Entertainment: 'bg-pink-500',
  Education: 'bg-cyan-500',
  Other: 'bg-slate-500'
};

export const InsightsPage: React.FC = () => {
  const bills = useLiveQuery(() => db.bills.toArray(), []);

  // Filter by Month selection (defaults to current month YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Available months from actual bill dates
  const availableMonths = useMemo(() => {
    if (!bills || bills.length === 0) return [currentMonthStr];
    const monthSet = new Set<string>();
    monthSet.add(currentMonthStr);
    bills.forEach((b) => {
      if (b.date && b.date.length >= 7) {
        monthSet.add(b.date.substring(0, 7));
      }
    });
    return Array.from(monthSet).sort().reverse();
  }, [bills, currentMonthStr]);

  // Bills for selected month
  const monthBills = useMemo(() => {
    if (!bills) return [];
    return bills.filter((b) => b.date && b.date.startsWith(selectedMonth));
  }, [bills, selectedMonth]);

  const monthTotal = useMemo(() => {
    return monthBills.reduce((acc, b) => acc + (b.amount || 0), 0);
  }, [monthBills]);

  const avgBillAmount = useMemo(() => {
    return monthBills.length > 0 ? monthTotal / monthBills.length : 0;
  }, [monthBills, monthTotal]);

  // Category breakdown calculation
  const categoryBreakdown = useMemo<CategorySpend[]>(() => {
    if (monthBills.length === 0 || monthTotal === 0) return [];

    const map: Partial<Record<BillCategory, { total: number; count: number }>> = {};

    monthBills.forEach((b) => {
      const cat = b.category || 'Other';
      if (!map[cat]) {
        map[cat] = { total: 0, count: 0 };
      }
      map[cat]!.total += b.amount || 0;
      map[cat]!.count += 1;
    });

    return Object.entries(map)
      .map(([cat, data]) => ({
        category: cat as BillCategory,
        total: data!.total,
        count: data!.count,
        percentage: Math.round((data!.total / monthTotal) * 100),
        color: CATEGORY_COLORS[cat as BillCategory] || 'bg-slate-500'
      }))
      .sort((a, b) => b.total - a.total);
  }, [monthBills, monthTotal]);

  const formatMonthName = (mStr: string) => {
    try {
      const [year, month] = mStr.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } catch {
      return mStr;
    }
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Top Header & Month Picker */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Spending Insights</h2>
          <p className="text-xs text-slate-500">Calculated locally from saved bills</p>
        </div>

        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none py-1.5 pl-3 pr-8 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-hidden"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {formatMonthName(m)}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-indigo-600 rounded-3xl p-5 text-white shadow-lg shadow-indigo-200/50 col-span-2 space-y-2">
          <div className="flex items-center justify-between text-indigo-200">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {formatMonthName(selectedMonth)} Spend
            </span>
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="text-3xl font-black tracking-tight">
            ₹{monthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center space-x-3 text-xs text-indigo-100/90 pt-1 border-t border-indigo-500/40">
            <span>{monthBills.length} {monthBills.length === 1 ? 'bill' : 'bills'} recorded</span>
            <span>•</span>
            <span>Avg: ₹{avgBillAmount.toFixed(2)} / bill</span>
          </div>
        </div>
      </div>

      {/* Visual Category Breakdown */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center space-x-1.5">
            <PieChart className="w-4 h-4 text-indigo-600" />
            <span>Category Breakdown</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            {categoryBreakdown.length} active categories
          </span>
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-xs text-slate-500">No expenses recorded for this month.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Multi-segment Progress Bar */}
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
              {categoryBreakdown.map((cat) => (
                <div
                  key={cat.category}
                  style={{ width: `${Math.max(cat.percentage, 2)}%` }}
                  className={`h-full ${BAR_COLORS[cat.category] || 'bg-slate-400'}`}
                  title={`${cat.category}: ${cat.percentage}%`}
                />
              ))}
            </div>

            {/* List with percentages */}
            <div className="space-y-3 pt-1">
              {categoryBreakdown.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${BAR_COLORS[cat.category] || 'bg-slate-400'}`} />
                      <span className="font-bold text-slate-800">{cat.category}</span>
                      <span className="text-[10px] text-slate-400">({cat.count} bills)</span>
                    </div>
                    <div className="font-extrabold text-slate-900">
                      ₹{cat.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="ml-1.5 text-[11px] font-semibold text-slate-400">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                  {/* Subtle bar */}
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${BAR_COLORS[cat.category] || 'bg-slate-400'}`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Privacy Guarantee callout */}
      <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200/80 text-xs text-slate-600 space-y-1">
        <div className="font-bold text-slate-800 flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Local Storage Guarantee</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          All financial calculations, category totals, and bill records are processed 100% on this device inside IndexedDB. No external tracking or database synchronization.
        </p>
      </div>
    </div>
  );
};
