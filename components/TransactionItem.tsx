
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
    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow mb-3">
      <div className="flex items-center gap-4 flex-1">
        <div className={`p-3 rounded-full shrink-0 ${isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
          {isIncome ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-800">{translatedCategory}</h4>
          
          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <input 
                type="text"
                autoFocus
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
                className="w-full text-sm text-slate-700 bg-slate-50 border border-indigo-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button onClick={handleSave} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Lưu">
                <Check size={16} />
              </button>
              <button onClick={handleCancel} className="p-1 text-slate-400 hover:bg-slate-100 rounded" title="Hủy">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="group flex items-center gap-2">
              <p className="text-sm text-slate-500 truncate">{transaction.description}</p>
              <button 
                onClick={() => setIsEditing(true)} 
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-indigo-500 transition-all"
                title="Sửa lý do"
              >
                <Pencil size={12} />
              </button>
            </div>
          )}
          
          <p className="text-xs text-slate-400 mt-1">{formatDateTime(transaction.date)}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4 ml-4">
        <span className={`font-bold text-lg whitespace-nowrap ${isIncome ? 'text-emerald-600' : 'text-slate-800'}`}>
          {isIncome ? '+' : '-'}{Math.abs(transaction.amount).toLocaleString('vi-VN')} ₫
        </span>
        <div className="flex items-center gap-1">
          {!isEditing && (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 text-slate-300 hover:text-indigo-500 transition-colors hidden sm:block"
                title="Sửa lý do"
              >
                <Pencil size={16} />
              </button>
              <button 
                onClick={() => onDelete(transaction.id)}
                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                title="Delete Transaction"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
