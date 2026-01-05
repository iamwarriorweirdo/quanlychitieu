
import React, { useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { ArrowUpRight, ArrowDownLeft, Trash2, Pencil, Check, X } from 'lucide-react';
import { translations, Language } from '../utils/i18n';

interface Props {
  transaction: Transaction;
  onDelete: (id: string) => void;
  onUpdate: (transaction: Transaction) => void;
  lang: Language;
  formatCurrency: (amount: number) => string;
  timezone: string;
}

export const TransactionItem: React.FC<Props> = ({ transaction, onDelete, onUpdate, lang, formatCurrency, timezone }) => {
  const isIncome = transaction.type === TransactionType.INCOME;
  const t = translations[lang];
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(transaction.description);

  const translatedCategory = t.categories[transaction.category as keyof typeof t.categories] || transaction.category;

  const formatDateTime = (dateString: string) => {
    try {
        const d = new Date(dateString);
        return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : (lang === 'zh' ? 'zh-CN' : 'en-US'), {
            timeZone: timezone,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(d);
    } catch {
        return dateString;
    }
  };

  const handleSave = () => {
    if (editDesc.trim() !== transaction.description) {
      onUpdate({ ...transaction, description: editDesc.trim() });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditDesc(transaction.description);
    setIsEditing(false);
  };

  return (
    <div className="group relative flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 transition-all active:scale-[0.98] active:bg-slate-50">
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className={`p-2.5 rounded-xl shrink-0 border ${isIncome ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
          {isIncome ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-800 text-sm truncate">{translatedCategory}</h4>
            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">{formatDateTime(transaction.date)}</span>
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="text" autoFocus value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
                className="w-full text-xs text-slate-700 bg-slate-50 border border-indigo-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button onClick={handleSave} className="p-2 text-emerald-600 bg-emerald-50 rounded-lg"><Check size={14} /></button>
              <button onClick={handleCancel} className="p-2 text-slate-400 bg-slate-50 rounded-lg"><X size={14} /></button>
            </div>
          ) : (
            <p className="text-xs text-slate-500 truncate font-medium mt-1">{transaction.description}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 ml-3">
        <div className="flex flex-col items-end">
          <span className={`font-black text-sm whitespace-nowrap ${isIncome ? 'text-emerald-600' : 'text-slate-800'}`}>
            {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
          </span>
          {!isEditing && (
            <div className="flex gap-1 mt-1.5 transition-opacity duration-200 md:opacity-0 group-hover:opacity-100 opacity-100">
               <button 
                 onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
                 className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                 title="Chỉnh sửa"
               >
                 <Pencil size={14}/>
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onDelete(transaction.id); }} 
                 className="p-1.5 text-slate-400 hover:text-rose-500 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                 title="Xóa"
               >
                 <Trash2 size={14}/>
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
