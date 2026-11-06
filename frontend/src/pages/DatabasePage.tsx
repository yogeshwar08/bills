import React, { useEffect, useState, useMemo } from 'react';
import {
  Database,
  RefreshCw,
  Search,
  Trash2,
  Code2,
  CheckCircle2,
  AlertCircle,
  X,
  TrendingUp,
  Filter,
  Sparkles
} from 'lucide-react';
import { fetchScans, fetchScanStats, deleteScanRecord, seedScans } from '../services/api';
import { SqliteScanRecord, SqliteScanStats, ClassificationType } from '../types';

interface DatabasePageProps {
  onOpenScan: () => void;
}

export const DatabasePage: React.FC<DatabasePageProps> = ({ onOpenScan }) => {
  const [scans, setScans] = useState<SqliteScanRecord[]>([]);
  const [stats, setStats] = useState<SqliteScanStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<ClassificationType | 'ALL'>('ALL');
  const [selectedScan, setSelectedScan] = useState<SqliteScanRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [scansData, statsData] = await Promise.all([
        fetchScans(100, 0),
        fetchScanStats().catch(() => null)
      ]);
      setScans(scansData);
      setStats(statsData);
    } catch (err: any) {
      setError(err?.message || 'Could not load records from SQLite database.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeedRecords = async () => {
    setIsSeeding(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await seedScans(true);
      setSuccessMessage(res.message || 'Successfully populated 20 benchmark records.');
      await loadData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err?.message || 'Failed to seed benchmark records into SQLite.');
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (scanId: string) => {
    if (!window.confirm(`Are you sure you want to delete scan record "${scanId}" from SQLite?`)) {
      return;
    }
    setDeletingId(scanId);
    try {
      await deleteScanRecord(scanId);
      setScans((prev) => prev.filter((s) => s.scan_id !== scanId));
      if (selectedScan?.scan_id === scanId) {
        setSelectedScan(null);
      }
      // Reload stats
      fetchScanStats().then((st) => setStats(st)).catch(() => {});
    } catch (err: any) {
      alert(err?.message || 'Failed to delete record.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredScans = useMemo(() => {
    return scans.filter((s) => {
      const matchesSearch =
        !searchTerm.trim() ||
        s.scan_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.merchant_name && s.merchant_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.filename && s.filename.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFilter = filterType === 'ALL' || s.classification === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [scans, searchTerm, filterType]);

  const formatConfidence = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'N/A';
    return `${Math.round(val * 100)}%`;
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-semibold mb-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>SQLite 3 Engine • backend/bills.db</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Database Table
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Live structured records persisted in the SQLite backend on every AI bill scan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isLoading || isSeeding}
            onClick={handleSeedRecords}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Populate 20 verified evaluation benchmark records into SQLite"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : 'text-indigo-600'}`} />
            <span>{isSeeding ? 'Loading Benchmark...' : 'Load Benchmark Records'}</span>
          </button>
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={onOpenScan}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-indigo-200 transition-all cursor-pointer"
          >
            <span>+ Scan New Bill</span>
          </button>
        </div>
      </div>

      {/* Database Statistics Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Scans</span>
            <Database className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats?.total_scans ?? scans.length}
          </div>
          <p className="text-[11px] text-slate-500">Recorded in SQLite</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Genuine Bills</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats?.total_bills ?? scans.filter((s) => s.classification === 'BILL').length}
          </div>
          <p className="text-[11px] text-slate-500">Verified transactions</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Non-Bills</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {stats?.total_non_bills ?? scans.filter((s) => s.classification !== 'BILL').length}
          </div>
          <p className="text-[11px] text-slate-500">Rejected non-receipts</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Captured Spending</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ₹{(stats?.total_spending ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">Sum of scanned amounts</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Merchant, ID, Category..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden transition-all"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 shrink-0" />
          {(['ALL', 'BILL', 'NON_BILL', 'UNCERTAIN'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                filterType === t
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'ALL' ? 'All Records' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold text-slate-500">Querying SQLite database...</p>
          </div>
        ) : filteredScans.length === 0 ? (
          <div className="py-16 text-center space-y-4 px-4 max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base">No records found</h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {searchTerm || filterType !== 'ALL'
                  ? 'No database records match your filter criteria. Try clearing your search or filter.'
                  : 'No bills have been saved in SQLite yet. You can immediately load the 20 verified benchmark receipts or scan your first receipt!'}
              </p>
            </div>
            {!searchTerm && filterType === 'ALL' && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isSeeding}
                  onClick={handleSeedRecords}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-sm shadow-indigo-200 transition-all cursor-pointer disabled:opacity-60"
                >
                  <Sparkles className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} />
                  <span>{isSeeding ? 'Populating Database...' : 'Populate 20 Benchmark Records'}</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenScan}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                >
                  <span>+ Scan New Bill</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4"># ID</th>
                  <th className="py-3.5 px-4">Scan Reference</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Merchant Name</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Confidence</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredScans.map((row) => (
                  <tr
                    key={row.scan_id}
                    className="hover:bg-indigo-50/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedScan(row)}
                  >
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{row.id}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 text-[11px]">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {row.scan_id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          row.classification === 'BILL'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : row.classification === 'NON_BILL'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {row.classification}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-[160px] truncate">
                      {row.merchant_name || (
                        <span className="text-slate-400 italic">None detected</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {row.bill_date || <span className="text-slate-400">N/A</span>}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 whitespace-nowrap">
                      {row.total_amount !== null && row.total_amount !== undefined ? (
                        `${row.currency === 'INR' ? '₹' : row.currency || ''} ${row.total_amount.toFixed(2)}`
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {row.category ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold text-[10px]">
                          {row.category}
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-700 font-semibold text-[11px]">
                        {formatConfidence(row.classification_confidence)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {row.created_at}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedScan(row)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="View JSON detail"
                        >
                          <Code2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === row.scan_id}
                          onClick={() => handleDelete(row.scan_id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail / Raw JSON Inspection Modal */}
      {selectedScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-none">
                    Record Detail: {selectedScan.scan_id}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    ID #{selectedScan.id} • Created: {selectedScan.created_at}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScan(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Field Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Classification</span>
                  <div className="font-bold text-slate-800">{selectedScan.classification}</div>
                  <div className="text-[10px] text-slate-500">Conf: {formatConfidence(selectedScan.classification_confidence)}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Merchant</span>
                  <div className="font-bold text-slate-800 truncate">{selectedScan.merchant_name || 'N/A'}</div>
                  <div className="text-[10px] text-slate-500">Conf: {formatConfidence(selectedScan.merchant_confidence)}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Total Amount</span>
                  <div className="font-extrabold text-slate-900">
                    {selectedScan.total_amount ? `₹${selectedScan.total_amount.toFixed(2)}` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-500">Conf: {formatConfidence(selectedScan.total_amount_confidence)}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Date</span>
                  <div className="font-bold text-slate-800">{selectedScan.bill_date || 'N/A'}</div>
                  <div className="text-[10px] text-slate-500">Conf: {formatConfidence(selectedScan.bill_date_confidence)}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Category</span>
                  <div className="font-bold text-slate-800">{selectedScan.category || 'N/A'}</div>
                  <div className="text-[10px] text-slate-500">Conf: {formatConfidence(selectedScan.category_confidence)}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Source Filename</span>
                  <div className="font-mono text-slate-800 truncate text-[11px]">{selectedScan.filename || 'unknown'}</div>
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs space-y-1">
                <span className="font-bold text-indigo-900 text-[11px] uppercase tracking-wider">AI Reasoning</span>
                <p className="text-slate-700 leading-relaxed">{selectedScan.reason}</p>
              </div>

              {/* Raw JSON Payload */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Raw JSON Stored in SQLite</span>
                </span>
                <pre className="p-3.5 rounded-2xl bg-slate-900 text-emerald-400 text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed border border-slate-800">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(selectedScan.raw_json), null, 2);
                    } catch {
                      return selectedScan.raw_json;
                    }
                  })()}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedScan(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
