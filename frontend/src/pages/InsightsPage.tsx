import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  PieChart as PieIcon,
  TrendingUp,
  Sparkles,
  ChevronDown,
  Award,
  Receipt,
  Calendar,
  Layers
} from 'lucide-react';
import { db } from '../database/db';
import { BillCategory } from '../types';

interface CategorySpend {
  category: BillCategory;
  total: number;
  count: number;
  percentage: number;
  hex: string;
  bgClass: string;
  textClass: string;
}

// Multi-color palette for all 9 categories
const CATEGORY_PALETTE: Record<
  BillCategory,
  { hex: string; bg: string; text: string; lightBg: string }
> = {
  Food: { hex: '#f97316', bg: 'bg-orange-500', text: 'text-orange-700', lightBg: 'bg-orange-50 border-orange-200' },
  Groceries: { hex: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-700', lightBg: 'bg-emerald-50 border-emerald-200' },
  Utilities: { hex: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-700', lightBg: 'bg-blue-50 border-blue-200' },
  Shopping: { hex: '#8b5cf6', bg: 'bg-purple-500', text: 'text-purple-700', lightBg: 'bg-purple-50 border-purple-200' },
  Transportation: { hex: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-700', lightBg: 'bg-amber-50 border-amber-200' },
  Healthcare: { hex: '#f43f5e', bg: 'bg-rose-500', text: 'text-rose-700', lightBg: 'bg-rose-50 border-rose-200' },
  Entertainment: { hex: '#ec4899', bg: 'bg-pink-500', text: 'text-pink-700', lightBg: 'bg-pink-50 border-pink-200' },
  Education: { hex: '#06b6d4', bg: 'bg-cyan-500', text: 'text-cyan-700', lightBg: 'bg-cyan-50 border-cyan-200' },
  Other: { hex: '#64748b', bg: 'bg-slate-500', text: 'text-slate-700', lightBg: 'bg-slate-50 border-slate-200' }
};

export const InsightsPage: React.FC = () => {
  const bills = useLiveQuery(() => db.bills.toArray(), []);

  // Filter by Month selection (defaults to current month YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [hoveredCategory, setHoveredCategory] = useState<BillCategory | null>(null);

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
      .map(([cat, data]) => {
        const pal = CATEGORY_PALETTE[cat as BillCategory] || CATEGORY_PALETTE.Other;
        return {
          category: cat as BillCategory,
          total: data!.total,
          count: data!.count,
          percentage: Math.round((data!.total / monthTotal) * 100),
          hex: pal.hex,
          bgClass: pal.bg,
          textClass: pal.text
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [monthBills, monthTotal]);

  // Top category
  const topCategory = categoryBreakdown[0] || null;

  const formatMonthName = (mStr: string) => {
    try {
      const [year, month] = mStr.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, 1);
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } catch {
      return mStr;
    }
  };

  // Pie / Donut Chart Geometry Calculations
  const RADIUS = 68;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~427.25

  // Calculate cumulative slice offsets for SVG stroke-dasharray
  const pieSlices = useMemo(() => {
    let accumulated = 0;
    return categoryBreakdown.map((item) => {
      const strokeLength = (item.total / monthTotal) * CIRCUMFERENCE;
      const offset = accumulated;
      accumulated += strokeLength;
      return {
        ...item,
        strokeLength,
        offset
      };
    });
  }, [categoryBreakdown, monthTotal, CIRCUMFERENCE]);

  // Active selected or hovered category details
  const activeDetail = useMemo(() => {
    if (hoveredCategory) {
      return categoryBreakdown.find((c) => c.category === hoveredCategory) || null;
    }
    return null;
  }, [hoveredCategory, categoryBreakdown]);

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header & Month Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold mb-1">
            <PieIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Interactive Financial Analytics</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Spending Insights
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time multi-color pie chart breakdown calculated 100% locally from your saved bills
          </p>
        </div>

        {/* Month Selector Dropdown */}
        <div className="relative self-start sm:self-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="appearance-none py-2 pl-3.5 pr-9 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-hidden hover:border-indigo-300 transition-colors"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                📅 {formatMonthName(m)}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Month Spend */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-5 text-white shadow-lg shadow-indigo-200/50 space-y-1">
          <div className="flex items-center justify-between text-indigo-200">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Spend</span>
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight">
            ₹{monthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-indigo-200/80">{formatMonthName(selectedMonth)}</p>
        </div>

        {/* Bill Count */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Bills Recorded</span>
            <Receipt className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {monthBills.length}
          </div>
          <p className="text-[11px] text-slate-500">Processed this month</p>
        </div>

        {/* Average Bill */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Average Bill</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{avgBillAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">Per bill average</p>
        </div>

        {/* Top Spending Category */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Top Category</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
            {topCategory ? topCategory.category : 'None'}
          </div>
          <p className="text-[11px] text-slate-500">
            {topCategory ? `${topCategory.percentage}% of spending` : 'No bills logged'}
          </p>
        </div>
      </div>

      {/* Main Responsive Grid: Multi-Color Pie Chart & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Interactive Multi-Color Donut / Pie Chart */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base tracking-tight flex items-center space-x-2">
              <PieIcon className="w-5 h-5 text-indigo-600" />
              <span>Multi-Color Pie Chart</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-semibold bg-slate-100 px-2.5 py-1 rounded-full">
              Hover slices to inspect
            </span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-200 flex items-center justify-center mx-auto text-slate-300">
                <PieIcon className="w-10 h-10" />
              </div>
              <p className="text-xs font-semibold text-slate-500">No expenses recorded for {formatMonthName(selectedMonth)}.</p>
              <p className="text-[11px] text-slate-400">Scan a bill to view the live multi-color pie chart.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              {/* SVG Donut / Pie Chart */}
              <div className="relative w-64 h-64 sm:w-72 sm:h-72">
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full transform -rotate-90 filter drop-shadow-xs"
                >
                  {/* Subtle Background Track */}
                  <circle
                    cx="100"
                    cy="100"
                    r={RADIUS}
                    fill="transparent"
                    stroke="#f1f5f9"
                    strokeWidth="28"
                  />

                  {/* Dynamic Multi-Color Category Slices */}
                  {pieSlices.map((slice) => {
                    const isHovered = hoveredCategory === slice.category;
                    return (
                      <circle
                        key={slice.category}
                        cx="100"
                        cy="100"
                        r={RADIUS}
                        fill="transparent"
                        stroke={slice.hex}
                        strokeWidth={isHovered ? 34 : 26}
                        strokeDasharray={`${Math.max(slice.strokeLength - 1.5, 0.5)} ${CIRCUMFERENCE}`}
                        strokeDashoffset={-slice.offset}
                        strokeLinecap="round"
                        className="transition-all duration-300 cursor-pointer hover:opacity-95"
                        onMouseEnter={() => setHoveredCategory(slice.category)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onClick={() => setHoveredCategory(slice.category === hoveredCategory ? null : slice.category)}
                      />
                    );
                  })}
                </svg>

                {/* Center of Donut: Dynamic Metric Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 pointer-events-none">
                  {activeDetail ? (
                    <div className="animate-in fade-in duration-200 space-y-0.5">
                      <div
                        className="text-xs font-extrabold uppercase tracking-wider"
                        style={{ color: activeDetail.hex }}
                      >
                        {activeDetail.category}
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        ₹{activeDetail.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] font-bold text-slate-500">
                        {activeDetail.percentage}% of month ({activeDetail.count} {activeDetail.count === 1 ? 'bill' : 'bills'})
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Total Spending
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        ₹{monthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">
                        {categoryBreakdown.length} Categories
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Colorful Mini Legend Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
                {categoryBreakdown.map((cat) => (
                  <button
                    key={cat.category}
                    type="button"
                    onMouseEnter={() => setHoveredCategory(cat.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() => setHoveredCategory(cat.category === hoveredCategory ? null : cat.category)}
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      hoveredCategory === cat.category
                        ? 'ring-2 ring-indigo-500 shadow-xs scale-105'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cat.hex }}
                    />
                    <span>{cat.category}</span>
                    <span className="text-[10px] text-slate-500">{cat.percentage}%</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Detailed Category Breakdown Cards */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base tracking-tight flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Category Spending Breakdown</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">
              {categoryBreakdown.length} active
            </span>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No expenses recorded yet.
            </div>
          ) : (
            <div className="space-y-3.5">
              {categoryBreakdown.map((cat) => {
                const isHovered = hoveredCategory === cat.category;
                return (
                  <div
                    key={cat.category}
                    onMouseEnter={() => setHoveredCategory(cat.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isHovered
                        ? 'bg-slate-50/80 border-indigo-300 shadow-xs scale-[1.01]'
                        : 'bg-white border-slate-200/70 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full shadow-2xs shrink-0"
                          style={{ backgroundColor: cat.hex }}
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-sm leading-tight">
                            {cat.category}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {cat.count} {cat.count === 1 ? 'bill' : 'bills'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-extrabold text-slate-900 text-sm">
                          ₹{cat.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <span
                          className="text-[11px] font-extrabold px-1.5 py-0.2 rounded"
                          style={{ color: cat.hex }}
                        >
                          {cat.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Multi-Colored Horizontal Fill Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.hex
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Privacy & On-Device Guarantee Callout */}
      <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200/80 text-xs text-slate-600 space-y-1">
        <div className="font-bold text-slate-800 flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Local Storage Privacy Guarantee</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          All financial calculations, pie chart angles, category breakdowns, and sums are computed in-memory directly from your on-device IndexedDB database. No personal financial information is ever uploaded to external analytical servers.
        </p>
      </div>
    </div>
  );
};
