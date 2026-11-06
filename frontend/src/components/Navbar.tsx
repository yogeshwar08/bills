import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ReceiptText, Wifi, WifiOff, Camera, Home, History, PieChart, Database } from 'lucide-react';
import { fetchHealth } from '../services/api';

interface NavbarProps {
  onOpenScan?: () => void;
  onOpenAddExpense?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenScan }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial health check
    checkServer();
    const interval = setInterval(checkServer, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const checkServer = async () => {
    try {
      const data = await fetchHealth();
      setServerOnline(true);
      setGeminiConfigured(Boolean(data.gemini_configured));
    } catch {
      setServerOnline(false);
      setGeminiConfigured(null);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Logo and Brand */}
        <NavLink to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200 group-hover:bg-indigo-700 transition-colors">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg leading-none">Bill Snap</span>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-indigo-100">AI</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-tight hidden sm:block">Your bills, organized in seconds</p>
          </div>
        </NavLink>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`
            }
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </NavLink>
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`
            }
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </NavLink>
          <NavLink
            to="/insights"
            className={({ isActive }) =>
              `flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`
            }
          >
            <PieChart className="w-4 h-4" />
            <span>Insights</span>
          </NavLink>
          <NavLink
            to="/database"
            className={({ isActive }) =>
              `flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`
            }
          >
            <Database className="w-4 h-4" />
            <span>Database</span>
          </NavLink>
        </nav>

        {/* Right Action: Connectivity status & Scan Button */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 text-xs">
          {onOpenScan && (
            <button
              type="button"
              onClick={onOpenScan}
              className="inline-flex items-center space-x-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-sm shadow-indigo-200 transition-all cursor-pointer touch-manipulation"
              title="Open Scan Receipt"
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Scan Bill</span>
              <span className="sm:hidden">Scan</span>
            </button>
          )}

          {!isOnline ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium text-[11px]">
              <WifiOff className="w-3.5 h-3.5 mr-1.5 text-rose-500" /> Offline
            </span>
          ) : serverOnline === true && geminiConfigured === true ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[11px]" title="AI Vision Ready">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span> AI Ready
            </span>
          ) : serverOnline === true && geminiConfigured === false ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium text-[11px]" title="Set GEMINI_API_KEY in backend/.env">
              <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span> Key Needed
            </span>
          ) : serverOnline === false ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium text-[11px]" title="Backend offline">
              <span className="w-2 h-2 rounded-full bg-slate-400 mr-1.5"></span> Local Only
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 border border-slate-200 font-medium text-[11px]">
              <Wifi className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Connecting
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
