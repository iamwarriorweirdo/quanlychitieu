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
      // Set defaults when opening
      const now = new Date();
      // Format YYYY-MM-DD
      const dateStr = now.toLocaleDateString('en-CA'); 
      // Format HH:MM
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      setDate(dateStr);
      setTime(timeStr);
      setAmount('');
      setDescription('');
      setType(TransactionType.EXPENSE);
      setCategory(Category.OTHER);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) return;

    // Combine Date and Time
    const combinedDateTime = new Date(`${date}T${time}:00`).toISOString();

    onSave({
      amount: parseFloat(amount),
      type,
      category,
      description: description || 'No description',
      date: combinedDateTime
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
          <h2 className="text-lg font-bold">{t.manual.title}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Amount & Type Toggle */}
          <div className="flex gap-4">
             <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 mb-1">{t.manual.amount}</label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-lg"
                    placeholder="0"
                  />
                </div>
             </div>
             
             <div className="flex flex-col justify-end">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setType(TransactionType.INCOME)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${type === TransactionType.INCOME ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {t.manual.income}
                  </button>
                  <button
                    type="button"
                    onClick={() => setType(TransactionType.EXPENSE)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${type === TransactionType.EXPENSE ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {t.manual.expense}
                  </button>
                </div>
             </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{t.manual.category}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              {Object.entries(translations[lang].categories).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">{t.manual.date}</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>
            <div className="w-1/3">
              <label className="block text-xs font-semibold text-slate-500 mb-1">{t.manual.time}</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="time" 
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Note / Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">{t.manual.note}</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-slate-400" size={16} />
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
                placeholder="..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
            >
              {t.manual.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-xl transition-colors shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={18} />
              {t.manual.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};