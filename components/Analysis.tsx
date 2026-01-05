
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
  formatCurrency: (amount: number) => string;
}

export const Analysis: React.FC<Props> = ({ 
  transactions, lang, filterMode, setFilterMode, 
  filterDate, setFilterDate, rangeStart, setRangeStart, rangeEnd, setRangeEnd, formatCurrency 
}) => {
  const t = translations[lang];

  // Logic lọc giao dịch
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

  const COLORS = ['#4f46e5', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444', '#06b6d4'];

  // Style Tooltip chung cho các biểu đồ - Chuyển sang sáng để dễ đọc hơn
  const customTooltipStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '10px 14px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  };

  const customItemStyle = {
    color: '#1e293b',
    fontWeight: '700',
    fontSize: '13px',
  };

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
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200">
           <PieIcon className="w-16 h-16 mx-auto text-slate-200 mb-4" />
           <p className="text-slate-400 font-medium">{t.analysis.noData}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-500 font-medium">{t.dashboard.income}</span>
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={16}/></div>
              </div>
              <p className="text-xl font-black text-emerald-600">+{formatCurrency(stats.income)}</p>
            </div>
            
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-500 font-medium">{t.dashboard.expense}</span>
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><TrendingDown size={16}/></div>
              </div>
              <p className="text-xl font-black text-rose-600">-{formatCurrency(stats.expense)}</p>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-500 font-medium">{t.analysis.netIncome}</span>
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Wallet size={16}/></div>
              </div>
              <p className={`text-xl font-black ${stats.balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                {formatCurrency(stats.balance)}
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-500 font-medium">{t.analysis.savingsRate}</span>
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><PiggyBank size={16}/></div>
              </div>
              <p className={`text-xl font-black ${stats.savingsRate > 20 ? 'text-emerald-500' : stats.savingsRate > 0 ? 'text-amber-500' : 'text-rose-500'}`}>
                {stats.savingsRate.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">{t.analysis.expenseRatio}</h3>
            <div className="h-6 w-full bg-slate-50 rounded-full overflow-hidden flex relative border border-slate-100">
               {stats.income === 0 && stats.expense === 0 ? (
                 <div className="w-full bg-slate-100"></div>
               ) : (
                 <>
                   <div style={{ width: `${Math.max(0, 100 - stats.expenseRatio)}%` }} className="h-full bg-emerald-500 transition-all duration-700"></div>
                   <div style={{ width: `${Math.min(100, stats.expenseRatio)}%` }} className="h-full bg-rose-500 transition-all duration-700"></div>
                 </>
               )}
            </div>
            <div className="flex justify-between mt-3 text-[10px] font-black uppercase tracking-tighter">
               <span className="text-emerald-600">{t.dashboard.income} ({Math.max(0, 100 - stats.expenseRatio).toFixed(1)}%)</span>
               <span className="text-rose-600">{t.dashboard.expense} ({Math.min(100, stats.expenseRatio).toFixed(1)}%)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-[400px]">
               <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6">{t.analysis.expenseBreakdown}</h3>
               {expenseData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="85%">
                   <PieChart>
                     <Pie data={expenseData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={4} dataKey="value">
                       {expenseData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <ReTooltip 
                       formatter={(value) => formatCurrency(Number(value))} 
                       contentStyle={customTooltipStyle}
                       itemStyle={customItemStyle}
                       labelStyle={{display: 'none'}}
                     />
                     <Legend 
                       verticalAlign="bottom" 
                       height={36} 
                       iconType="circle"
                       formatter={(value) => <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter ml-1">{value}</span>}
                     />
                   </PieChart>
                 </ResponsiveContainer>
               ) : <div className="h-full flex items-center justify-center text-slate-300 font-medium italic">{t.analysis.noExpenseData}</div>}
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-[400px]">
               <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6">{t.analysis.incomeBreakdown}</h3>
               {incomeData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="85%">
                   <PieChart>
                     <Pie data={incomeData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={4} dataKey="value">
                       {incomeData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                       ))}
                     </Pie>
                     <ReTooltip 
                       formatter={(value) => formatCurrency(Number(value))} 
                       contentStyle={customTooltipStyle}
                       itemStyle={customItemStyle}
                       labelStyle={{display: 'none'}}
                     />
                     <Legend 
                       verticalAlign="bottom" 
                       height={36} 
                       iconType="circle"
                       formatter={(value) => <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter ml-1">{value}</span>}
                     />
                   </PieChart>
                 </ResponsiveContainer>
               ) : <div className="h-full flex items-center justify-center text-slate-300 font-medium italic">{t.analysis.noIncomeData}</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
