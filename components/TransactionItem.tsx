
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
    <div className="flex items-center justify-between p-3.5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-100 transition-all active:scale-[0.98] active:bg-slate-50">
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className={`p-2.5 rounded-xl shrink-0 ${isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
          {isIncome ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-800 text-sm truncate">{translatedCategory}</h4>
            <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">{formatDateTime(transaction.date)}</span>
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="text" autoFocus value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
                className="w-full text-xs text-slate-700 bg-slate-50 border border-indigo-200 rounded-lg px-2 py-1 outline-none"
              />
              <button onClick={handleSave} className="p-1 text-emerald-600"><Check size={14} /></button>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 truncate font-medium">{transaction.description}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3 ml-3">
        <div className="flex flex-col items-end">
          <span className={`font-black text-sm whitespace-nowrap ${isIncome ? 'text-emerald-600' : 'text-slate-800'}`}>
            {isIncome ? '+' : '-'}{transaction.amount.toLocaleString('vi-VN')}
          </span>
          {!isEditing && (
            <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 md:opacity-100">
               <button onClick={() => setIsEditing(true)} className="text-slate-300 hover:text-indigo-500"><Pencil size={12}/></button>
               <button onClick={() => onDelete(transaction.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={12}/></button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
