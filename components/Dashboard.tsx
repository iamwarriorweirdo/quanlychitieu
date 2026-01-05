
import React, { useMemo } from 'react';
import { User, Transaction, TransactionType } from '../types';
import { TransactionItem } from './TransactionItem';
import { Wallet, TrendingUp, TrendingDown, Search, Loader2, Plus, Wand2, Image as ImageIcon, Filter } from 'lucide-react';
import { translations, Language } from '../utils/i18n';
import { DateFilter, FilterMode } from './DateFilter';
import { saveTransaction } from '../services/storageService';
import { Currency } from '../App';

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
  formatCurrency: (amount: number) => string;
  currency: Currency;
  timezone: string;
}

export const Dashboard: React.FC<Props> = ({ 
  user, transactions, isLoading, onDelete, onTransactionsUpdated, lang, openAiScan, openManualModal,
  filterMode, setFilterMode, filterDate, setFilterDate, 
  rangeStart, setRangeStart, rangeEnd, setRangeEnd, formatCurrency, currency, timezone 
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
    } catch (error) { alert(t.common.saveFailed); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2 md:mb-4 px-1">
         <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{t.dashboard.overview}</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{t.dashboard.hello}, {user.username}</p>
         </div>
         <div className="flex gap-2">
            <button 
              onClick={() => openAiScan('image')} 
              className="bg-indigo-50 text-indigo-600 border border-indigo-100 p-2.5 rounded-xl active:scale-90 transition-all hover:bg-indigo-600 hover:text-white flex items-center gap-2"
              title={t.dashboard.aiScan}
            >
               <Wand2 size={20} />
               <span className="hidden md:inline text-xs font-bold">{t.dashboard.aiScan}</span>
            </button>
            <button 
              onClick={openManualModal}
              className="hidden md:flex bg-white border border-slate-200 text-slate-700 p-2.5 rounded-xl active:scale-90 transition-all hover:bg-slate-50 items-center gap-2"
            >
               <Plus size={20} />
               <span className="text-xs font-bold">{t.dashboard.manualAdd}</span>
            </button>
         </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden mx-1">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={120} /></div>
        <p className="text-indigo-100 text-[10px] uppercase font-bold tracking-widest mb-1">{t.dashboard.balance}</p>
        <h3 className="text-2xl md:text-3xl font-black tracking-tight truncate">
          {formatCurrency(stats.balance)}
        </h3>
        <div className="mt-6 flex flex-wrap gap-2 items-center">
          <div className="bg-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold backdrop-blur-md flex items-center gap-1.5 border border-white/10 shadow-sm">
            <TrendingUp size={12} className="text-emerald-400" /> <span className="text-emerald-50">+{formatCurrency(stats.income)}</span>
          </div>
          <div className="bg-white/10 px-3 py-1.5 rounded-full text-[10px] font-bold backdrop-blur-md flex items-center gap-1.5 border border-white/10 shadow-sm">
            <TrendingDown size={12} className="text-rose-400" /> <span className="text-rose-50">-{formatCurrency(stats.expense)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-1">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder={t.dashboard.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 bg-white shadow-sm border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800 text-sm font-medium placeholder:text-slate-400"
          />
        </div>
        <div className="flex overflow-x-auto pb-2 no-scrollbar gap-2 -mx-1 px-1">
            <DateFilter 
              mode={filterMode} setMode={setFilterMode}
              date={filterDate} setDate={setFilterDate}
              rangeStart={rangeStart} setRangeStart={setRangeStart}
              rangeEnd={rangeEnd} setRangeEnd={setRangeEnd}
              lang={lang}
            />
        </div>
      </div>

      <div className="space-y-4 px-1 pb-10">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest flex items-center gap-2">
             {t.dashboard.history}
             <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100">{filteredTransactions.length}</span>
          </h3>
        </div>
        {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
        ) : filteredTransactions.length > 0 ? (
          <div className="space-y-3">
            {filteredTransactions.map(tx => (
              <TransactionItem key={tx.id} transaction={tx} onDelete={onDelete} onUpdate={handleUpdateTransaction} lang={lang} formatCurrency={formatCurrency} timezone={timezone} />
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
