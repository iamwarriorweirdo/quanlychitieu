
import React from 'react';
import { Filter, ArrowRight } from 'lucide-react';
import { translations, Language } from '../utils/i18n';

export type FilterMode = 'day' | 'week' | 'month' | 'range' | 'all';

interface Props {
  mode: FilterMode;
  setMode: (mode: FilterMode) => void;
  date: string;
  setDate: (date: string) => void;
  rangeStart: string;
  setRangeStart: (date: string) => void;
  rangeEnd: string;
  setRangeEnd: (date: string) => void;
  lang: Language;
}

export const DateFilter: React.FC<Props> = ({ 
  mode, setMode, date, setDate, rangeStart, setRangeStart, rangeEnd, setRangeEnd, lang 
}) => {
  const t = translations[lang];

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="relative">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as FilterMode)}
          className="appearance-none pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition-colors"
        >
          <option value="all">{t.dashboard.filter.all}</option>
          <option value="day">{t.dashboard.filter.day}</option>
          <option value="week">{t.dashboard.filter.week}</option>
          <option value="month">{t.dashboard.filter.month}</option>
          <option value="range">{t.dashboard.filter.range}</option>
        </select>
        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>

      {mode === 'range' ? (
        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 pl-2">
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">{t.dashboard.filter.from}</span>
            <input 
              type="date" 
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="outline-none text-slate-600 dark:text-slate-300 bg-transparent text-sm font-medium py-2 cursor-pointer w-28 sm:w-32"
            />
          </div>
          <ArrowRight size={14} className="text-slate-300 dark:text-slate-600" />
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 rounded-lg">
            <span className="text-xs text-slate-400 font-medium">{t.dashboard.filter.to}</span>
            <input 
              type="date" 
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="outline-none text-slate-600 dark:text-slate-300 bg-transparent text-sm font-medium py-2 cursor-pointer w-28 sm:w-32"
            />
          </div>
        </div>
      ) : mode !== 'all' ? (
        <div className="relative border-l border-slate-200 dark:border-slate-700 pl-2">
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="outline-none text-slate-600 dark:text-slate-300 bg-transparent text-sm font-medium py-2 pl-2 cursor-pointer"
          />
        </div>
      ) : null}
    </div>
  );
};
