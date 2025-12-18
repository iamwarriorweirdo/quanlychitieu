
import React, { useMemo } from 'react';
import { User, Transaction, TransactionType } from '../types';
import { TransactionItem } from './TransactionItem';
import { Wallet, TrendingUp, TrendingDown, Search, Loader2, Plus, Wand2, Image as ImageIcon } from 'lucide-react';
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
  
  // Filter Props passed from Parent
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

  // Filtering Logic
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
  }, [transactions, filterDate, filterMode, searchQuery, rangeStart, rangeEnd]);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
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
    } catch (error) {
      alert("Cập nhật thất bại.");
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      
      {/* Header with Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
         <div>
            <h2 className="text-2xl font-bold text-slate-800">{t.dashboard.overview}</h2>
            <p className="text-slate-500 text-sm hidden md:block">Chào mừng trở lại, {user.username}</p>
         </div>
         
         <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="hidden sm:block">
               <DateFilter 
                  mode={filterMode} setMode={setFilterMode}
                  date={filterDate} setDate={setFilterDate}
                  rangeStart={rangeStart} setRangeStart={setRangeStart}
                  rangeEnd={rangeEnd} setRangeEnd={setRangeEnd}
                  lang={lang}
               />
            </div>
            
            {/* Action Buttons in Header */}
            <div className="flex items-center gap-2 ml-auto lg:ml-0">
               <button 
                onClick={() => openAiScan('image')}
                className="bg-white text-indigo-600 border border-indigo-100 p-2.5 rounded-xl shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2"
                title={t.dashboard.aiScan}
               >
                 <ImageIcon size={20} />
                 <span className="text-sm font-bold hidden xl:inline">{t.dashboard.aiScan}</span>
               </button>
               <button 
                onClick={openManualModal}
                className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2"
               >
                 <Plus size={20} />
                 <span className="text-sm font-bold">{t.dashboard.quickAdd}</span>
               </button>
            </div>
         </div>
      </div>

      {/* Search Bar & Mobile Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input 
            type="text" 
            placeholder={t.dashboard.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white shadow-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800 text-sm"
          />
        </div>
        <div className="sm:hidden">
            <DateFilter 
              mode={filterMode} setMode={setFilterMode}
              date={filterDate} setDate={setFilterDate}
              rangeStart={rangeStart} setRangeStart={setRangeStart}
              rangeEnd={rangeEnd} setRangeEnd={setRangeEnd}
              lang={lang}
            />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Wallet size={80} />
            </div>
            <p className="text-indigo-100 text-sm font-medium mb-1">{searchQuery ? t.dashboard.filteredBalance : t.dashboard.balance}</p>
            <h3 className="text-3xl font-bold">{stats.balance.toLocaleString('vi-VN')} ₫</h3>
            <div className="mt-4 flex items-center gap-2 text-indigo-100 text-xs">
              <Wallet size={14} /> {t.dashboard.available}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Income</span>
            </div>
            <p className="text-slate-500 text-sm">{t.dashboard.income}</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.income.toLocaleString('vi-VN')} ₫</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <TrendingDown size={20} />
              </div>
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">Expense</span>
            </div>
            <p className="text-slate-500 text-sm">{t.dashboard.expense}</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.expense.toLocaleString('vi-VN')} ₫</h3>
          </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
           {t.dashboard.history}
           <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{filteredTransactions.length}</span>
        </h3>
        {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        ) : filteredTransactions.length > 0 ? (
          <div className="space-y-3">
            {filteredTransactions.map(tx => (
              <TransactionItem 
                key={tx.id} 
                transaction={tx} 
                onDelete={onDelete} 
                onUpdate={handleUpdateTransaction}
                lang={lang} 
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
              <Search size={32} />
            </div>
            <h4 className="text-slate-800 font-medium">{t.dashboard.noTx}</h4>
            <p className="text-slate-400 text-sm mt-1">
              {t.dashboard.noTxSub}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
