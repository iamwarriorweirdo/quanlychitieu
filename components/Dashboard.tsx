import React, { useState, useEffect, useMemo } from 'react';
import { User, Transaction, TransactionType, ParsedTransactionData, Category } from '../types';
import { getTransactions, saveTransaction, deleteTransaction } from '../services/storageService';
import { TransactionItem } from './TransactionItem';
import { AIParserModal } from './AIParserModal';
import { Plus, LogOut, Wallet, TrendingUp, TrendingDown, Wand2, Filter, Search, QrCode, Landmark, CheckCircle2, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';

interface Props {
  user: User;
  onLogout: () => void;
}

export const Dashboard: React.FC<Props> = ({ user, onLogout }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalMode, setAiModalMode] = useState<'text' | 'image'>('text');
  
  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [isBankLinked, setIsBankLinked] = useState(false);
  
  // Initialize date filter with current date in Vietnam Timezone
  const [filterDate, setFilterDate] = useState<string>(() => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  });

  // Load data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getTransactions(user.id);
        setTransactions(data);
      } catch (error) {
        console.error("Failed to load transactions", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user.id]);

  // Handlers
  const handleAddTransaction = async (data: ParsedTransactionData) => {
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      userId: user.id,
      createdAt: Date.now(),
      ...data
    };
    
    // Optimistic UI update could be done here, but let's wait for DB
    try {
      const updated = await saveTransaction(user.id, newTx);
      setTransactions(updated);
    } catch (error) {
      alert("Không thể lưu giao dịch. Vui lòng thử lại.");
    }
  };

  const handleManualAdd = async () => {
    const desc = prompt("Nhập nội dung giao dịch:");
    if (!desc) return;
    const amountStr = prompt("Nhập số tiền:");
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return;
    
    // Default to EXPENSE for manual quick add unless specified
    await handleAddTransaction({
      description: desc,
      amount: amount,
      category: Category.OTHER,
      type: TransactionType.EXPENSE,
      date: new Date().toISOString()
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa giao dịch này không?")) {
      try {
        const updated = await deleteTransaction(user.id, id);
        setTransactions(updated);
      } catch (error) {
        alert("Xóa thất bại.");
      }
    }
  };

  const openAiScan = (mode: 'text' | 'image' = 'text') => {
    setAiModalMode(mode);
    setIsAiModalOpen(true);
  };

  // Derived State (Stats & Filtering)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search Logic: If query exists, search across everything. If not, filter by date.
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          t.description.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query) ||
          t.amount.toString().includes(query)
        );
      } else {
        // Date Logic
        const txDate = new Date(t.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        return txDate === filterDate;
      }
    });
  }, [transactions, filterDate, searchQuery]);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === TransactionType.INCOME) income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
      categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
    });
    return Object.keys(categoryMap).map(key => ({ name: key, value: categoryMap[key] }));
  }, [filteredTransactions]);

  const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#3b82f6'];

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Enhanced Navbar (Taskbar) */}
      <nav className="bg-white shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            
            {/* Logo */}
            <div className="flex items-center gap-2 min-w-max">
              <div className="bg-indigo-600 text-white p-2 rounded-lg">
                <Wallet size={20} />
              </div>
              <h1 className="text-xl font-bold text-slate-800 hidden sm:block">Quản lý chi tiêu</h1>
            </div>

            {/* Search Bar */}
            <div className="flex-1 w-full max-w-xl relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Tìm kiếm giao dịch..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-slate-800 text-sm"
              />
            </div>

            {/* Right Actions: QR, Bank, User */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              
              {/* Scan QR Button */}
              <button 
                onClick={() => openAiScan('image')}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors"
                title="Quét QR Hóa đơn"
              >
                <QrCode size={18} />
                <span className="hidden lg:inline">Quét QR</span>
              </button>

              {/* Bank Link Button */}
              <button 
                onClick={() => setIsBankLinked(!isBankLinked)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  isBankLinked 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Liên kết ngân hàng"
              >
                {isBankLinked ? <CheckCircle2 size={18} /> : <Landmark size={18} />}
                <span className="hidden lg:inline">{isBankLinked ? 'VCB' : 'Liên kết NH'}</span>
              </button>
              
              <div className="h-6 w-px bg-slate-200 mx-1"></div>

              {/* User Logout */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700 hidden lg:block truncate max-w-[100px]">{user.username}</span>
                <button 
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                  title="Đăng xuất"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 space-y-8">
        
        {/* Date Filter (Hidden if searching) */}
        {!searchQuery && (
          <div className="flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-2xl font-bold text-slate-800">Tổng quan trong ngày</h2>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-200">
              <Filter size={16} className="text-slate-400" />
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="outline-none text-slate-600 bg-transparent text-sm font-medium"
              />
            </div>
          </div>
        )}
        
        {searchQuery && (
           <div className="text-slate-500 text-sm">
             Kết quả tìm kiếm cho: <span className="font-semibold text-slate-800">"{searchQuery}"</span>
           </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
            <p className="text-indigo-100 text-sm font-medium mb-1">Số dư {searchQuery ? '(Lọc)' : 'hiện tại'}</p>
            <h3 className="text-3xl font-bold">{stats.balance.toLocaleString('vi-VN')} đ</h3>
            <div className="mt-4 flex items-center gap-2 text-indigo-100 text-xs">
              <Wallet size={14} /> Khả dụng
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Tổng Thu</span>
            </div>
            <p className="text-slate-500 text-sm">Thu nhập {searchQuery ? 'tìm thấy' : 'trong ngày'}</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.income.toLocaleString('vi-VN')} đ</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <TrendingDown size={20} />
              </div>
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">Tổng Chi</span>
            </div>
            <p className="text-slate-500 text-sm">Chi tiêu {searchQuery ? 'tìm thấy' : 'trong ngày'}</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.expense.toLocaleString('vi-VN')} đ</h3>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart Section */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-80">
            <h3 className="font-semibold text-slate-800 mb-4">Phân bổ chi tiêu</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(value) => `${Number(value).toLocaleString('vi-VN')} đ`} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <p>{isLoading ? 'Đang tải...' : 'Chưa có dữ liệu'}</p>
              </div>
            )}
          </div>

          {/* Transactions List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Lịch sử giao dịch</h3>
              <button onClick={handleManualAdd} className="text-sm text-indigo-600 font-medium hover:underline">
                Thêm nhanh thủ công
              </button>
            </div>
            
            {isLoading ? (
               <div className="flex items-center justify-center py-20">
                 <Loader2 className="animate-spin text-indigo-600" size={32} />
               </div>
            ) : filteredTransactions.length > 0 ? (
              <div className="space-y-3">
                {filteredTransactions.map(tx => (
                  <TransactionItem key={tx.id} transaction={tx} onDelete={handleDelete} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Search size={32} />
                </div>
                <h4 className="text-slate-800 font-medium">Không tìm thấy giao dịch</h4>
                <p className="text-slate-400 text-sm mt-1">
                  {searchQuery ? 'Thử tìm với từ khóa khác' : 'Bắt đầu bằng cách thêm thủ công hoặc dùng AI quét.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-4">
         {/* AI Button */}
         <button 
          onClick={() => openAiScan('text')}
          className="group flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-4 rounded-full shadow-lg shadow-indigo-300 hover:scale-105 transition-all"
        >
          <Wand2 size={24} className="group-hover:rotate-12 transition-transform" />
          <span className="font-semibold pr-1">AI Scan</span>
        </button>

         {/* Manual Add Button */}
        <button 
          onClick={handleManualAdd}
          className="bg-white text-slate-600 p-4 rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition-all flex items-center justify-center"
        >
          <Plus size={24} />
        </button>
      </div>

      <AIParserModal 
        isOpen={isAiModalOpen} 
        onClose={() => setIsAiModalOpen(false)} 
        onSuccess={handleAddTransaction} 
        initialMode={aiModalMode}
      />
    </div>
  );
};