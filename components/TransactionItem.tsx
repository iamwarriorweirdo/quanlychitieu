
import React, { useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { ArrowUpRight, ArrowDownLeft, Trash2, Pencil, Check, X } from 'lucide-react';
import { translations, Language } from '../utils/i18n';

interface Props {
  transaction: Transaction;
  onDelete: (id: string) => void;
  onUpdate: (transaction: Transaction) => void;
  lang: Language;
}

export const TransactionItem: React.FC<Props> = ({ transaction, onDelete, onUpdate, lang }) => {
  const isIncome = transaction.type === TransactionType.INCOME;
  const t = translations[lang];
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(transaction.description);

  const translatedCategory = t.categories[transaction.category as keyof typeof t.categories] || transaction.category;

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
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
    <div className="group relative flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all active:scale-[0.98] active:bg-slate-50 dark:active:bg-slate-800/50">
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className={`p-2.5 rounded-xl shrink-0 ${isIncome ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
          {isIncome ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{translatedCategory}</h4>
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">{formatDateTime(transaction.date)}</span>
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="text" autoFocus value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
                className="w-full text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900 rounded-lg px-2 py-1 outline-none"
              />
              <button onClick={handleSave} className="p-2 text-emerald-600"><Check size={16} /></button>
              <button onClick={handleCancel} className="p-2 text-slate-400"><X size={16} /></button>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium mt-0.5">{transaction.description}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-4 ml-3">
        <div className="flex flex-col items-end">
          <span className={`font-black text-sm whitespace-nowrap ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
            {isIncome ? '+' : '-'}{transaction.amount.toLocaleString('vi-VN')}
          </span>
          {!isEditing && (
            <div className="flex gap-1 mt-1.5 transition-opacity duration-200 md:opacity-0 group-hover:opacity-100 opacity-100">
               <button 
                 onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
                 className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 dark:bg-slate-800 md:bg-transparent rounded-lg"
                 title="Chỉnh sửa"
               >
                 <Pencil size={14}/>
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onDelete(transaction.id); }} 
                 className="p-1.5 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-800 md:bg-transparent rounded-lg"
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
