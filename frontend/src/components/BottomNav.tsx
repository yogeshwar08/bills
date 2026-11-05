import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, History, PieChart, Database } from 'lucide-react';

export const BottomNav: React.FC = () => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg">
      <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-around">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 py-1 transition-colors ${
              isActive ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <Home className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">Home</span>
        </NavLink>

        <NavLink
          to="/history"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 py-1 transition-colors ${
              isActive ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <History className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">History</span>
        </NavLink>

        <NavLink
          to="/insights"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 py-1 transition-colors ${
              isActive ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <PieChart className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">Insights</span>
        </NavLink>

        <NavLink
          to="/database"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 py-1 transition-colors ${
              isActive ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <Database className="w-5 h-5 mb-1" />
          <span className="text-[10px] tracking-tight">Database</span>
        </NavLink>
      </div>
    </nav>
  );
};
