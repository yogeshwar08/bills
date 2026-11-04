import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, ArrowUpDown, Receipt, Trash2, Plus } from 'lucide-react';
import { db } from '../database/db';
import { SavedBill, BillCategory } from '../types';
import { BillDetailModal } from '../components/BillDetailModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface HistoryPageProps {
  onOpenUpload: () => void;
}

const CATEGORY_FILTERS: (BillCategory | 'All')[] = [
  'All',
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

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

export const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenUpload }) => {
  const allBills = useLiveQuery(() => db.bills.toArray(), []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BillCategory | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const [selectedBill, setSelectedBill] = useState<SavedBill | null>(null);
  const [billToDelete, setBillToDelete] = useState<SavedBill | null>(null);

  const filteredBills = useMemo(() => {
    if (!allBills) return [];

    let list = [...allBills];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((b) => 
        b.merchantName.toLowerCase().includes(q) ||
        (b.notes && b.notes.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      list = list.filter((b) => b.category === selectedCategory);
    }

    // Sorting
    list.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'highest':
          return b.amount - a.amount;
        case 'lowest':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });

    return list;
  }, [allBills, searchTerm, selectedCategory, sortBy]);

  const filteredSpending = useMemo(() => {
    return filteredBills.reduce((acc, b) => acc + (b.amount || 0), 0);
  }, [filteredBills]);

  const handleDeleteConfirmed = async () => {
    if (billToDelete) {
      await db.bills.delete(billToDelete.id);
      setBillToDelete(null);
      setSelectedBill(null);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header & Quick Counter */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Bill History</h2>
          <p className="text-xs text-slate-500">
            {filteredBills.length} {filteredBills.length === 1 ? 'bill' : 'bills'} • ₹
            {filteredSpending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenUpload}
          className="py-2 px-3 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Scan</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by merchant or store..."
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white shadow-2xs"
        />
      </div>

      {/* Category Filter Pills (Horizontal Scroll) */}
      <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
        {CATEGORY_FILTERS.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Sort Dropdown */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Showing results:</span>
        <div className="flex items-center space-x-1.5">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-transparent font-medium text-slate-700 outline-hidden cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest amount</option>
            <option value="lowest">Lowest amount</option>
          </select>
        </div>
      </div>

      {/* Bills List or Empty State */}
      {filteredBills.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 text-center space-y-3 mt-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800 text-sm">
              {searchTerm || selectedCategory !== 'All' ? 'No matching bills' : 'No saved bills yet'}
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {searchTerm || selectedCategory !== 'All'
                ? 'Try clearing your search query or choosing another category filter.'
                : 'Scan or upload a bill to begin organizing your expenses locally.'}
            </p>
          </div>
          {(searchTerm || selectedCategory !== 'All') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All');
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredBills.map((b) => (
            <div
              key={b.id}
              onClick={() => setSelectedBill(b)}
              className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                  {b.thumbnailBase64 ? (
                    <img src={b.thumbnailBase64} alt={b.merchantName} className="w-full h-full object-cover" />
                  ) : (
                    <Receipt className="w-5 h-5 text-slate-500" />
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

              <div className="text-right shrink-0 flex items-center space-x-3">
                <div>
                  <div className="font-extrabold text-slate-900 text-sm">
                    {b.currency === 'INR' ? '₹' : b.currency} {b.amount.toFixed(2)}
                  </div>
                  {b.userCorrected && (
                    <span className="text-[10px] text-amber-600 font-medium">User Corrected</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBillToDelete(b);
                  }}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete bill"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
