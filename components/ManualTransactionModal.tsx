
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Banknote, FileText, CheckCircle2 } from 'lucide-react';
import { ParsedTransactionData, TransactionType, Category } from '../types';
import { translations, Language } from '../utils/i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ParsedTransactionData) => void;
  lang: Language;
}

export const ManualTransactionModal: React.FC<Props> = ({ isOpen, onClose, onSave, lang }) => {
  const t = translations[lang];
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState<string>(Category.OTHER);
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setDate(now.toLocaleDateString('en-CA'));
      setTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      setAmount(''); setDescription(''); setType(TransactionType.EXPENSE); setCategory(Category.OTHER);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) return;
    const combinedDateTime = new Date(`${date}T${time}:00`).toISOString();
    onSave({ amount: parseFloat(amount), type, category, description: description || 'Ghi chép thủ công', date: combinedDateTime });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-20 duration-300">
        <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
          <h2 className="text-lg font-black tracking-tight">{t.manual.title}</h2>
          <button onClick={onClose} className="bg-white/20 p-1.5 rounded-full hover:bg-white/30 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          <div className="space-y-4">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t.manual.amount}</label>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-black text-slate-300">₫</span>
                  <input 
                    type="number" autoFocus required value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent text-3xl font-black text-slate-800 outline-none placeholder:text-slate-200"
                    placeholder="0"
                  />
                </div>
             </div>
             
             <div className="flex p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button" onClick={() => setType(TransactionType.INCOME)}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                >
                  {t.manual.income}
                </button>
                <button
                  type="button" onClick={() => setType(TransactionType.EXPENSE)}
                  className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
                >
                  {t.manual.expense}
                </button>
             </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{t.manual.category}</label>
              <select
                value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold appearance-none"
              >
                {Object.entries(translations[lang].categories).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{t.manual.date}</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
              </div>
              <div className="w-1/3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{t.manual.time}</label>
                <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{t.manual.note}</label>
              <textarea 
                value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm font-medium"
                placeholder="Mua sắm gì đó..."
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <CheckCircle2 size={20} />
            {t.manual.save}
          </button>
        </form>
      </div>
    </div>
  );
};
