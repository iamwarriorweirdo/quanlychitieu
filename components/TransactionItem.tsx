import React from 'react';
import { Transaction, TransactionType } from '../types';
import { ArrowUpRight, ArrowDownLeft, Trash2 } from 'lucide-react';

interface Props {
  transaction: Transaction;
  onDelete: (id: string) => void;
}

export const TransactionItem: React.FC<Props> = ({ transaction, onDelete }) => {
  const isIncome = transaction.type === TransactionType.INCOME;

  // Format date to Vietnamese locale with time
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
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
          <h4 className="font-semibold text-slate-800">{transaction.category}</h4>
          <p className="text-sm text-slate-500">{transaction.description}</p>
          <p className="text-xs text-slate-400 mt-1">{formatDateTime(transaction.date)}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={`font-bold text-lg ${isIncome ? 'text-emerald-600' : 'text-slate-800'}`}>
          {isIncome ? '+' : '-'}{Math.abs(transaction.amount).toLocaleString('vi-VN')} đ
        </span>
        <button 
          onClick={() => onDelete(transaction.id)}
          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
          title="Xóa giao dịch"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
