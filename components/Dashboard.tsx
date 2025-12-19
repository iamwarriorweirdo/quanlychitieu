
import React, { useMemo } from 'react';
import { User, Transaction, TransactionType } from '../types';
import { TransactionItem } from './TransactionItem';
import { Wallet, TrendingUp, TrendingDown, Search, Loader2, Plus, Wand2, Image as ImageIcon, Filter } from 'lucide-react';
import { translations, Language } from '../utils/i18n';
import { DateFilter, FilterMode } from './DateFilter';
import { saveTransaction } from '../services/storageService';

interface Props {
  user: User;
  transactions: Transaction[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onTransactionsUpdated: (updatedList: Transaction[]) => void;
  lang: Language;
  openAiScan: (mode: 'text' | 'image') => void;
  openManualModal: () => void;
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  filterDate: string;
  setFilterDate: (date: string) => void;
  rangeStart: string;
  setRangeStart: (date: string) => void;
  rangeEnd: string;
  setRangeEnd: (date: string) => void;
}

export const Dashboard: React.FC<Props> = ({ 
  user, transactions, isLoading, onDelete, onTransactionsUpdated, lang, openAiScan, openManualModal,
  filterMode, setFilterMode, filterDate, setFilterDate, 
  rangeStart, setRangeStart, rangeEnd, setRangeEnd 
}) => {

  const [searchQuery, setSearchQuery] = React.useState('');
  const t = translations[lang];

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          t.amount.toString().includes(query)
        );
      } 
      const txDate = new Date(t.date);
      const selectedDate = new Date(filterDate);
      if (filterMode === 'all') return true;
      if (filterMode === 'range') {
        const start = new Date(rangeStart); start.setHours(0, 0, 0, 0);
        const end = new Date(rangeEnd); end.setHours(23, 59, 59, 999);
        return txDate >= start && txDate <= end;
      }
      if (filterMode === 'day') return txDate.toLocaleDateString('en-CA') === filterDate;
      if (filterMode === 'month') return txDate.getMonth() === selectedDate.getMonth() && txDate.getFullYear() === selectedDate.getFullYear();
      if (filterMode === 'week') {
        const dayOfWeek = selectedDate.getDay();
        const startOfWeek = new Date(selectedDate); startOfWeek.setDate(selectedDate.getDate() - dayOfWeek); startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); endOfWeek.setHours(23, 59, 59, 999);
        return txDate >= startOfWeek && txDate <= endOfWeek;
      }
      return true;
    });
  }, [transactions, filterDate, filterMode, searchQuery, rangeStart, rangeEnd]);

  const stats = useMemo(() => {
    let income = 0; let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === TransactionType.INCOME) income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    try {
      const newList = await saveTransaction(user.id, updatedTx);
      onTransactionsUpdated(newList);
    } catch (error) { alert("Cập nhật thất bại."); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2 md:mb-4">
         <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{t.dashboard.overview}</h2>
            <p className="text-slate-500 text-xs font-medium">Xin chào, {user.username}</p>
         </div>
         <button onClick={() => openAiScan('image')} className="md:hidden bg-indigo-50 text-indigo-600 p-2.5 rounded-xl">
            <Wand2 size={20} />
         </button>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={120} /></div>
        <p className="text-indigo-100 text-[10px] uppercase font-bold tracking-widest mb-1">{t.dashboard.balance}</p>
        <h3 className="text-3xl font-black tracking-tight">{stats.balance.toLocaleString('vi-VN')} ₫</h3>
        <div className="mt-6 flex gap-4 items-center">
          <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md flex items-center gap-1.5 border border-white/10">
            <TrendingUp size={12} className="text-emerald-400" /> +{stats.income.toLocaleString('vi-VN')}
          </div>
          <div className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-md flex items-center gap-1.5 border border-white/10">
            <TrendingDown size={12} className="text-rose-400" /> -{stats.expense.toLocaleString('vi-VN')}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder={t.dashboard.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 bg-white shadow-sm border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800 text-sm font-medium"
          />
        </div>
        <div className="flex overflow-x-auto pb-1 no-scrollbar gap-2">
            <DateFilter 
              mode={filterMode} setMode={setFilterMode}
              date={filterDate} setDate={setFilterDate}
              rangeStart={rangeStart} setRangeStart={setRangeStart}
              rangeEnd={rangeEnd} setRangeEnd={setRangeEnd}
              lang={lang}
            />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
             {t.dashboard.history}
             <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">{filteredTransactions.length}</span>
          </h3>
        </div>
        {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
        ) : filteredTransactions.length > 0 ? (
          <div className="space-y-3">
            {filteredTransactions.map(tx => (
              <TransactionItem key={tx.id} transaction={tx} onDelete={onDelete} onUpdate={handleUpdateTransaction} lang={lang} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300"><Search size={32} /></div>
            <h4 className="text-slate-800 font-bold">{t.dashboard.noTx}</h4>
            <p className="text-slate-400 text-xs mt-1 font-medium">{t.dashboard.noTxSub}</p>
          </div>
        )}
      </div>
    </div>
  );
};
