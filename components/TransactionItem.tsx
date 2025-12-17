import React from 'react';
import { Transaction, TransactionType } from '../types';
import { ArrowUpRight, ArrowDownLeft, Trash2 } from 'lucide-react';
import { translations, Language } from '../utils/i18n';

interface Props {
  transaction: Transaction;
  onDelete: (id: string) => void;
  lang: Language;
}

export const TransactionItem: React.FC<Props> = ({ transaction, onDelete, lang }) => {
  const isIncome = transaction.type === TransactionType.INCOME;
  const t = translations[lang];

  // Map internal category to translated category
  const translatedCategory = t.categories[transaction.category as keyof typeof t.categories] || transaction.category;

  // Format date based on language
  const formatDateTime = (dateString: string) => {
    let locale = 'vi-VN';
    if (lang === 'en') locale = 'en-GB';
    if (lang === 'zh') locale = 'zh-CN';

    return new Date(dateString).toLocaleString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow mb-3">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
          {isIncome ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
        </div>
        <div>
          <h4 className="font-semibold text-slate-800">{translatedCategory}</h4>
          <p className="text-sm text-slate-500">{transaction.description}</p>
          <p className="text-xs text-slate-400 mt-1">{formatDateTime(transaction.date)}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`font-bold text-lg ${isIncome ? 'text-emerald-600' : 'text-slate-800'}`}>
          {isIncome ? '+' : '-'}{Math.abs(transaction.amount).toLocaleString('vi-VN')} ₫
        </span>
        <button 
          onClick={() => onDelete(transaction.id)}
          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
          title="Delete Transaction"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};