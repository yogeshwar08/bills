import React, { useEffect, useState } from 'react';
import { ReceiptText, Wifi, WifiOff } from 'lucide-react';
import { fetchHealth } from '../services/api';

export const Navbar: React.FC = () => {
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
      <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-900 tracking-tight text-lg leading-none">Bill Snap</span>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-indigo-100">AI</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-tight">Your bills, organized in seconds</p>
          </div>
        </div>

        {/* Connectivity status */}
        <div className="flex items-center space-x-2 text-xs">
          {!isOnline ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium text-[11px]">
              <WifiOff className="w-3 h-3 mr-1 text-rose-500" /> Offline
            </span>
          ) : serverOnline === true && geminiConfigured === true ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[11px]" title="AI Vision Ready">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span> AI Ready
            </span>
          ) : serverOnline === true && geminiConfigured === false ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium text-[11px]" title="Set GEMINI_API_KEY in backend/.env">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span> Key Needed
            </span>
          ) : serverOnline === false ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium text-[11px]" title="Backend offline">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></span> Local Only
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 font-medium text-[11px]">
              <Wifi className="w-3 h-3 mr-1 text-slate-400" /> Connecting
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

