
import React, { useState, useEffect } from 'react';
import { getCurrentSession, loginUser, registerUser, setCurrentSession, initDB, getTransactions, saveTransaction, deleteTransaction, getGoals, saveGoal, deleteGoal, getBudgets, saveBudget, deleteBudget, loginWithGoogle } from './services/storageService';
import { User, Transaction, ParsedTransactionData, Goal, Budget } from './types';
import { Dashboard } from './components/Dashboard';
import { Analysis } from './components/Analysis';
import { Planning } from './components/Planning';
import { InvestmentPage } from './components/Investment';
import { AdminPanel } from './components/AdminPanel';
import { AIParserModal } from './components/AIParserModal';
import { ManualTransactionModal } from './components/ManualTransactionModal';
import { FilterMode } from './components/DateFilter';
import { Wallet, LogOut, Plus, Wand2, LayoutDashboard, PieChart, ClipboardList, TrendingUp, Shield, User as UserIcon, Settings, Globe, ChevronRight, Bell, Smartphone, ShieldCheck, Loader2 } from 'lucide-react';
import { translations, Language } from './utils/i18n';

const GOOGLE_CLIENT_ID = "598430888470-bnchhoarr75hoas2rjbgn0ue54ud4i7k.apps.googleusercontent.com";

type View = 'dashboard' | 'analysis' | 'planning' | 'investment' | 'admin' | 'settings' | 'account';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [filterDate, setFilterDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [rangeStart, setRangeStart] = useState<string>(() => {
     const d = new Date(); d.setDate(1); return d.toLocaleDateString('en-CA');
  });
  const [rangeEnd, setRangeEnd] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const [error, setError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lang, setLang] = useState<Language>('vi');
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalMode, setAiModalMode] = useState<'text' | 'image'>('text');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    const init = async () => {
      await initDB().catch(console.error);
      const session = getCurrentSession();
      if (session) setUser(session);
      setIsInitializing(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!user && !isInitializing) {
      const handleCredentialResponse = async (response: any) => {
        setIsAuthLoading(true);
        setError('');
        try {
          const loggedInUser = await loginWithGoogle(response.credential);
          setUser(loggedInUser);
          setCurrentSession(loggedInUser);
        } catch (err: any) {
          setError("Xác thực Google thất bại: " + err.message);
        } finally {
          setIsAuthLoading(false);
        }
      };

      const renderGoogleBtn = () => {
        if ((window as any).google?.accounts?.id) {
          (window as any).google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
          });
          const btnContainer = document.getElementById("googleBtn");
          if (btnContainer) {
            (window as any).google.accounts.id.renderButton(btnContainer, { 
              theme: "outline", size: "large", width: "100%", text: "continue_with", shape: "rectangular"
            });
          }
        } else {
          setTimeout(renderGoogleBtn, 300);
        }
      };
      renderGoogleBtn();
    }
  }, [user, isInitializing]);

  useEffect(() => {
    if (user?.id) {
      const fetchData = async () => {
        setIsLoadingTx(true);
        try {
          const [tx, g, b] = await Promise.all([
            getTransactions(user.id), getGoals(user.id), getBudgets(user.id)
          ]);
          setTransactions(tx); setGoals(g); setBudgets(b);
        } catch (e) { console.error(e); } finally { setIsLoadingTx(false); }
      };
      fetchData();
    }
  }, [user?.id]);

  const handleAddTransactions = async (dataList: ParsedTransactionData[]) => {
    if (!user) return;
    try {
      const promises = dataList.map(data => saveTransaction(user!.id, {
        id: crypto.randomUUID(), userId: user!.id, createdAt: Date.now(), ...data
      }));
      const results = await Promise.all(promises);
      if (results.length > 0) setTransactions(results[results.length - 1]);
    } catch (e) { alert(t.common.saveFailed); }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (confirm(t.common.deleteConfirm)) {
      try {
        setTransactions(await deleteTransaction(user.id, id));
      } catch (e) { alert(t.common.deleteFailed); }
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!usernameInput.trim() || !passwordInput.trim()) return setError(t.auth.errorUser);
    setIsAuthLoading(true);
    try {
      const res = isLoginView ? await loginUser(usernameInput, passwordInput) : await registerUser(usernameInput, passwordInput, emailInput, phoneInput);
      if (res) { setUser(res); setCurrentSession(res); }
      else setError(t.auth.errorLogin);
    } catch (err: any) { setError(err.message); } finally { setIsAuthLoading(false); }
  };

  const handleLogout = () => { 
    setUser(null); setCurrentSession(null); setCurrentView('dashboard'); 
    if ((window as any).google?.accounts?.id) (window as any).google.accounts.id.disableAutoSelect();
  };

  const handleAddGoal = async (g: Goal) => { if (user) setGoals(await saveGoal(user.id, g)); };
  const handleDeleteGoal = async (id: string) => { if (user && confirm('Xóa?')) setGoals(await deleteGoal(user.id, id)); };
  const handleAddBudget = async (b: Budget) => { if (user) setBudgets(await saveBudget(user.id, b)); };
  const handleDeleteBudget = async (id: string) => { if (user && confirm('Xóa?')) setBudgets(await deleteBudget(user.id, id)); };

  if (isInitializing) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-indigo-600 p-8 text-center text-white">
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"><Wallet className="w-8 h-8" /></div>
            <h1 className="text-2xl font-bold mb-1">{t.app.title}</h1>
            <p className="text-indigo-100 text-sm">{t.app.subtitle}</p>
          </div>
          <div className="p-8 space-y-4">
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="text" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" placeholder={t.auth.username} />
              <input type={showPassword ? "text" : "password"} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none" placeholder={t.auth.password} />
              {error && <p className="text-rose-500 text-sm bg-rose-50 p-2 rounded">{error}</p>}
              <button type="submit" disabled={isAuthLoading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 flex justify-center transition-colors">
                {isAuthLoading ? <Loader2 className="animate-spin" /> : (isLoginView ? t.auth.login : t.auth.createAccount)}
              </button>
            </form>
            <div className="relative flex items-center py-2"><div className="flex-grow border-t"></div><span className="mx-3 text-slate-400 text-xs">Hoặc</span><div className="flex-grow border-t"></div></div>
            <div id="googleBtn" className="flex justify-center min-h-[50px] overflow-hidden"></div>
            <button onClick={() => setIsLoginView(!isLoginView)} className="w-full text-center text-indigo-600 text-sm font-medium hover:underline">{isLoginView ? t.auth.newHere : t.auth.haveAccount}</button>
          </div>
        </div>
      </div>
    );
  }

  const BottomNavItem = ({ view, icon: Icon, label }: { view: View, icon: any, label: string }) => (
    <button 
      onClick={() => { setCurrentView(view); }} 
      className={`flex flex-col items-center gap-1 flex-1 py-2 transition-all ${currentView === view ? 'text-indigo-600' : 'text-slate-400'}`}
    >
      <Icon size={20} className={currentView === view ? 'scale-110' : ''} />
      <span className="text-[10px] font-bold tracking-tight">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="p-6 flex items-center gap-3 border-b">
          <div className="bg-indigo-600 text-white p-2 rounded-lg"><Wallet /></div>
          <h1 className="font-bold text-lg">{t.app.title}</h1>
        </div>
        
        <div className="p-4 border-b">
          <button 
            onClick={() => setIsManualModalOpen(true)}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
            <Plus size={20} /> Thêm giao dịch
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutDashboard size={20} />{t.nav.dashboard}</button>
          <button onClick={() => setCurrentView('analysis')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'analysis' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><PieChart size={20} />{t.nav.analysis}</button>
          <button onClick={() => setCurrentView('planning')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'planning' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><ClipboardList size={20} />{t.nav.planning}</button>
          <button onClick={() => setCurrentView('investment')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'investment' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><TrendingUp size={20} />{t.nav.investment}</button>
          {user.role === 'admin' && <button onClick={() => setCurrentView('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'admin' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Shield size={20} />{t.nav.admin}</button>}
          <button onClick={() => setCurrentView('account')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'account' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><UserIcon size={20} />Tài khoản</button>
        </nav>
        
        <div className="p-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">{user.avatar ? <img src={user.avatar} className="w-8 h-8 rounded-full border border-slate-100" alt="avatar" /> : <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><UserIcon size={16}/></div>}<span className="text-sm font-bold truncate text-slate-700">{user.username}</span></div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 transition-colors"><LogOut size={20} /></button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-4 pb-24 md:p-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-0">
          {currentView === 'dashboard' && <Dashboard user={user} transactions={transactions} isLoading={isLoadingTx} onDelete={handleDelete} onTransactionsUpdated={setTransactions} lang={lang} openAiScan={(m) => { setAiModalMode(m); setIsAiModalOpen(true); }} openManualModal={() => setIsManualModalOpen(true)} filterMode={filterMode} setFilterMode={setFilterMode} filterDate={filterDate} setFilterDate={setFilterDate} rangeStart={rangeStart} setRangeStart={setRangeStart} rangeEnd={rangeEnd} setRangeEnd={setRangeEnd} />}
          {currentView === 'analysis' && <Analysis transactions={transactions} lang={lang} filterMode={filterMode} setFilterMode={setFilterMode} filterDate={filterDate} setFilterDate={setFilterDate} rangeStart={rangeStart} setRangeStart={setRangeStart} rangeEnd={rangeEnd} setRangeEnd={setRangeEnd} />}
          {currentView === 'planning' && <Planning user={user} transactions={transactions} goals={goals} budgets={budgets} onAddGoal={handleAddGoal} onDeleteGoal={handleDeleteGoal} onUpdateGoal={handleAddGoal} onAddBudget={handleAddBudget} onDeleteBudget={handleDeleteBudget} lang={lang} />}
          {currentView === 'investment' && <InvestmentPage user={user} lang={lang} />}
          {currentView === 'admin' && user.role === 'admin' && <AdminPanel user={user} lang={lang} />}
          
          {currentView === 'account' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                    <div className="relative">
                        {user.avatar ? <img src={user.avatar} className="w-24 h-24 rounded-full border-4 border-indigo-50 shadow-lg" /> : <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-300"><UserIcon size={48}/></div>}
                        <div className="absolute bottom-1 right-1 bg-emerald-500 border-4 border-white w-6 h-6 rounded-full"></div>
                    </div>
                    <h2 className="mt-4 text-2xl font-black text-slate-800 tracking-tight">{user.username}</h2>
                    <p className="text-slate-400 text-sm font-bold">{user.email || user.phone || 'ID: ' + user.id.slice(0,8)}</p>
                    <div className="mt-6 flex gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                            {user.role === 'admin' ? 'Administrator' : 'Premium Member'}
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cài đặt giao diện</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Globe size={18} /></div>
                                <span className="text-sm font-bold text-slate-700">Ngôn ngữ</span>
                            </div>
                            <select value={lang} onChange={e => setLang(e.target.value as Language)} className="text-sm font-black text-indigo-600 bg-transparent outline-none">
                                <option value="vi">Tiếng Việt</option>
                                <option value="en">English</option>
                                <option value="zh">中文</option>
                            </select>
                        </div>
                        <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Smartphone size={18} /></div>
                                <span className="text-sm font-bold text-slate-700">Chế độ tối</span>
                            </div>
                            <div className="w-10 h-6 bg-slate-200 rounded-full relative"><div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full"></div></div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bảo mật & Hệ thống</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                        <button onClick={() => setCurrentView('investment')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><ShieldCheck size={18} /></div>
                                <span className="text-sm font-bold text-slate-700">Bảo mật cấp 2</span>
                            </div>
                            <ChevronRight size={16} className="text-slate-300" />
                        </button>
                        {user.role === 'admin' && (
                            <button onClick={() => setCurrentView('admin')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-indigo-600">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Shield size={18} /></div>
                                    <span className="text-sm font-bold">Bảng quản trị</span>
                                </div>
                                <ChevronRight size={16} className="text-indigo-300" />
                            </button>
                        )}
                        <button onClick={() => { setAiModalMode('image'); setIsAiModalOpen(true); }} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Wand2 size={18} /></div>
                                <span className="text-sm font-bold text-slate-700">Quét hóa đơn AI</span>
                            </div>
                            <ChevronRight size={16} className="text-slate-300" />
                        </button>
                    </div>
                </div>

                <button onClick={handleLogout} className="w-full p-5 bg-white border border-rose-100 text-rose-500 rounded-3xl font-black flex items-center justify-center gap-3 shadow-sm hover:bg-rose-50 transition-colors">
                    <LogOut size={20} /> Đăng xuất khỏi thiết bị
                </button>

                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pb-10">Finance Manager v1.0.4 • Made with ❤️</p>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Navigation Bar with Centered FAB */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-2 py-1 flex items-center justify-around z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
        <BottomNavItem view="dashboard" icon={LayoutDashboard} label={t.nav.dashboard} />
        <BottomNavItem view="analysis" icon={PieChart} label={t.nav.analysis} />
        
        {/* The Centered Add Button */}
        <div className="flex-1 flex justify-center -mt-8 relative h-full">
           <button 
             onClick={() => setIsManualModalOpen(true)}
             className="bg-indigo-600 text-white w-14 h-14 rounded-full shadow-2xl shadow-indigo-300 flex items-center justify-center hover:scale-110 active:scale-90 transition-all border-4 border-white z-[60]"
           >
             <Plus size={28} />
           </button>
           <div className="absolute top-8 w-16 h-16 bg-white rounded-full -z-10 border-t border-slate-100 shadow-inner"></div>
        </div>

        <BottomNavItem view="planning" icon={ClipboardList} label={t.nav.planning} />
        <BottomNavItem view="account" icon={UserIcon} label="Tài khoản" />
      </nav>

      <AIParserModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} onSuccess={handleAddTransactions} initialMode={aiModalMode} lang={lang} />
      <ManualTransactionModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} onSave={d => handleAddTransactions([d])} lang={lang} />
    </div>
  );
};

export default App;
