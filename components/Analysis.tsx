import React, { useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import { translations, Language } from '../utils/i18n';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DateFilter, FilterMode } from './DateFilter';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, PieChart as PieIcon } from 'lucide-react';

interface Props {
  transactions: Transaction[];
  lang: Language;
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  filterDate: string;
  setFilterDate: (date: string) => void;
  rangeStart: string;
  setRangeStart: (date: string) => void;
  rangeEnd: string;
  setRangeEnd: (date: string) => void;
}

export const Analysis: React.FC<Props> = ({ 
  transactions, lang, filterMode, setFilterMode, 
  filterDate, setFilterDate, rangeStart, setRangeStart, rangeEnd, setRangeEnd 
}) => {
  const t = translations[lang];

  // Logic lọc giao dịch (Replicated logic from Dashboard)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const selectedDate = new Date(filterDate);

      if (filterMode === 'all') return true;
      
      if (filterMode === 'range') {
        const start = new Date(rangeStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(rangeEnd);
        end.setHours(23, 59, 59, 999);
        return txDate >= start && txDate <= end;
      }

      if (filterMode === 'day') {
        return txDate.toLocaleDateString('en-CA') === filterDate;
      }

      if (filterMode === 'month') {
        return txDate.getMonth() === selectedDate.getMonth() && 
               txDate.getFullYear() === selectedDate.getFullYear();
      }

      if (filterMode === 'week') {
        const dayOfWeek = selectedDate.getDay();
        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return txDate >= startOfWeek && txDate <= endOfWeek;
      }
      return true;
    });
  }, [transactions, filterDate, filterMode, rangeStart, rangeEnd]);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === TransactionType.INCOME) income += t.amount;
      else expense += t.amount;
    });
    const balance = income - expense;
    // Calculate Ratios
    const totalVolume = income + expense;
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
    const expenseRatio = income > 0 ? (expense / income) * 100 : (expense > 0 ? 100 : 0);

    return { income, expense, balance, savingsRate, expenseRatio };
  }, [filteredTransactions]);

  const getCategoryData = (type: TransactionType) => {
    const map: Record<string, number> = {};
    filteredTransactions.filter(tx => tx.type === type).forEach(tx => {
       const displayName = translations[lang].categories[tx.category as keyof typeof translations['en']['categories']] || tx.category;
       map[displayName] = (map[displayName] || 0) + tx.amount;
    });
    return Object.keys(map).map(key => ({ name: key, value: map[key] })).sort((a, b) => b.value - a.value);
  };

  const expenseData = useMemo(() => getCategoryData(TransactionType.EXPENSE), [filteredTransactions, lang]);
  const incomeData = useMemo(() => getCategoryData(TransactionType.INCOME), [filteredTransactions, lang]);

  const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444', '#06b6d4'];

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">{t.analysis.title}</h2>
        <DateFilter 
          mode={filterMode} setMode={setFilterMode}
          date={filterDate} setDate={setFilterDate}
          rangeStart={rangeStart} setRangeStart={setRangeStart}
          rangeEnd={rangeEnd} setRangeEnd={setRangeEnd}
          lang={lang}
        />
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
           <PieIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
           <p className="text-slate-500">{t.analysis.noData}</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-500 font-medium">{t.dashboard.income}</span>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={16}/></div>
              </div>
              <p className="text-xl font-bold text-emerald-600">+{stats.income.toLocaleString('vi-VN')} ₫</p>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-500 font-medium">{t.dashboard.expense}</span>
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><TrendingDown size={16}/></div>
              </div>
              <p className="text-xl font-bold text-rose-600">-{stats.expense.toLocaleString('vi-VN')} ₫</p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-500 font-medium">{t.analysis.netIncome}</span>
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Wallet size={16}/></div>
              </div>
              <p className={`text-xl font-bold ${stats.balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                {stats.balance.toLocaleString('vi-VN')} ₫
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-500 font-medium">{t.analysis.savingsRate}</span>
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><PiggyBank size={16}/></div>
              </div>
              <p className={`text-xl font-bold ${stats.savingsRate > 20 ? 'text-emerald-500' : stats.savingsRate > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                {stats.savingsRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Ratio Bar */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{t.analysis.expenseRatio}</h3>
            <div className="h-6 w-full bg-emerald-100 rounded-full overflow-hidden flex relative">
               {stats.income === 0 && stats.expense === 0 ? (
                 <div className="w-full bg-slate-100"></div>
               ) : (
                 <>
                   <div style={{ width: `${100 - stats.expenseRatio}%` }} className="h-full bg-emerald-500"></div>
                   <div style={{ width: `${stats.expenseRatio}%` }} className="h-full bg-rose-500"></div>
                 </>
               )}
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium">
               <span className="text-emerald-600">{t.dashboard.income} ({Math.max(0, 100 - stats.expenseRatio).toFixed(1)}%)</span>
               <span className="text-rose-600">{t.dashboard.expense} ({Math.min(100, stats.expenseRatio).toFixed(1)}%)</span>
            </div>
          </div>

          {/* Charts Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Expense Breakdown */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96">
               <h3 className="font-semibold text-slate-800 mb-4">{t.analysis.expenseBreakdown}</h3>
               {expenseData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={expenseData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                       {expenseData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <ReTooltip formatter={(value) => `${Number(value).toLocaleString('vi-VN')} ₫`} />
                     <Legend verticalAlign="bottom" height={36}/>
                   </PieChart>
                 </ResponsiveContainer>
               ) : <div className="h-full flex items-center justify-center text-slate-400">No Expense Data</div>}
            </div>

            {/* Income Breakdown */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96">
               <h3 className="font-semibold text-slate-800 mb-4">{t.analysis.incomeBreakdown}</h3>
               {incomeData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={incomeData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                       {incomeData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                       ))}
                     </Pie>
                     <ReTooltip formatter={(value) => `${Number(value).toLocaleString('vi-VN')} ₫`} />
                     <Legend verticalAlign="bottom" height={36}/>
                   </PieChart>
                 </ResponsiveContainer>
               ) : <div className="h-full flex items-center justify-center text-slate-400">No Income Data</div>}
            </div>

          </div>
        </>
      )}
    </div>
  );
};