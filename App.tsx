
import React, { useState, useEffect } from 'react';
import { getCurrentSession, loginUser, registerUser, setCurrentSession, initDB, getTransactions, saveTransaction, deleteTransaction, getGoals, saveGoal, deleteGoal, getBudgets, saveBudget, deleteBudget, loginWithGoogle, syncOfflineData } from './services/storageService';
import { User, Transaction, ParsedTransactionData, Goal, Budget } from './types';
import { Dashboard } from './components/Dashboard';
import { Analysis } from './components/Analysis';
import { Planning } from './components/Planning';
import { InvestmentPage } from './components/Investment';
import { AdminPanel } from './components/AdminPanel';
import { AIParserModal } from './components/AIParserModal';
import { ManualTransactionModal } from './components/ManualTransactionModal';
import { FilterMode } from './components/DateFilter';
import { Wallet, LogOut, Plus, Wand2, LayoutDashboard, PieChart, ClipboardList, TrendingUp, Shield, User as UserIcon, Settings, Globe, ChevronRight, Bell, Smartphone, ShieldCheck, Loader2, CloudOff, Cloud } from 'lucide-react';
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Dark Mode Logic
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Online/Offline Tracker
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (user?.id) syncOfflineData(user.id);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user?.id]);

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
    if (!user && !isInitializing && isOnline) {
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
  }, [user, isInitializing, isOnline]);

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
      let lastList = transactions;
      for (const data of dataList) {
         lastList = await saveTransaction(user!.id, {
            id: crypto.randomUUID(), userId: user!.id, createdAt: Date.now(), ...data
         });
      }
      setTransactions(lastList);
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
    if (!isOnline && isLoginView) return setError("Cần kết nối mạng để đăng nhập lần đầu.");
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

  if (isInitializing) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-800">
          <div className="bg-indigo-600 p-8 text-center text-white relative">
            {!isOnline && <div className="absolute top-4 right-4 text-white/50"><CloudOff size={16}/></div>}
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"><Wallet className="w-8 h-8" /></div>
            <h1 className="text-2xl font-bold mb-1">{t.app.title}</h1>
            <p className="text-indigo-100 text-sm">{t.app.subtitle}</p>
          </div>
          <div className="p-8 space-y-4">
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="text" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} className="w-full px-4 py-3 rounded-lg border dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder={t.auth.username} />
              <input type={showPassword ? "text" : "password"} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full px-4 py-3 rounded-lg border dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder={t.auth.password} />
              {error && <p className="text-rose-500 text-sm bg-rose-50 dark:bg-rose-900/20 p-2 rounded">{error}</p>}
              <button type="submit" disabled={isAuthLoading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 flex justify-center transition-colors">
                {isAuthLoading ? <Loader2 className="animate-spin" /> : (isLoginView ? t.auth.login : t.auth.createAccount)}
              </button>
            </form>
            <div className="relative flex items-center py-2"><div className="flex-grow border-t dark:border-slate-800"></div><span className="mx-3 text-slate-400 text-xs">Hoặc</span><div className="flex-grow border-t dark:border-slate-800"></div></div>
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
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        <div className="p-6 flex items-center gap-3 border-b dark:border-slate-800">
          <div className="bg-indigo-600 text-white p-2 rounded-lg"><Wallet /></div>
          <div>
            <h1 className="font-bold text-lg dark:text-white leading-tight">{t.app.title}</h1>
            <div className="flex items-center gap-1 mt-0.5">
               <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
               <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{isOnline ? 'Online' : 'Offline Mode'}</span>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-b dark:border-slate-800">
          <button 
            onClick={() => setIsManualModalOpen(true)}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 dark:shadow-none transition-all active:scale-95"
          >
            <Plus size={20} /> Thêm giao dịch
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><LayoutDashboard size={20} />{t.nav.dashboard}</button>
          <button onClick={() => setCurrentView('analysis')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'analysis' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><PieChart size={20} />{t.nav.analysis}</button>
          <button onClick={() => setCurrentView('planning')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'planning' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><ClipboardList size={20} />{t.nav.planning}</button>
          <button onClick={() => setCurrentView('investment')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'investment' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><TrendingUp size={20} />{t.nav.investment}</button>
          {user.role === 'admin' && <button onClick={() => setCurrentView('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'admin' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Shield size={20} />{t.nav.admin}</button>}
          <button onClick={() => setCurrentView('account')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'account' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><UserIcon size={20} />Tài khoản</button>
        </nav>
        
        <div className="p-4 border-t dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">{user.avatar ? <img src={user.avatar} className="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-700" alt="avatar" /> : <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400"><UserIcon size={16}/></div>}<span className="text-sm font-bold truncate text-slate-700 dark:text-slate-300">{user.username}</span></div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 transition-colors"><LogOut size={20} /></button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-4 pb-24 md:p-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-0">
          {/* Offline Warning Banner */}
          {!isOnline && (
             <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-500">
                <CloudOff className="text-amber-600" size={20} />
                <div className="flex-1">
                   <p className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider">Đang ở chế độ Ngoại tuyến</p>
                   <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold">Dữ liệu sẽ được lưu cục bộ và đồng bộ khi có mạng trở lại.</p>
                </div>
             </div>
          )}

          {currentView === 'dashboard' && <Dashboard user={user} transactions={transactions} isLoading={isLoadingTx} onDelete={handleDelete} onTransactionsUpdated={setTransactions} lang={lang} openAiScan={(m) => { setAiModalMode(m); setIsAiModalOpen(true); }} openManualModal={() => setIsManualModalOpen(true)} filterMode={filterMode} setFilterMode={setFilterMode} filterDate={filterDate} setFilterDate={setFilterDate} rangeStart={rangeStart} setRangeStart={setRangeStart} rangeEnd={rangeEnd} setRangeEnd={setRangeEnd} />}
          {currentView === 'analysis' && <Analysis transactions={transactions} lang={lang} filterMode={filterMode} setFilterMode={setFilterMode} filterDate={filterDate} setFilterDate={setFilterDate} rangeStart={rangeStart} setRangeStart={setRangeStart} rangeEnd={rangeEnd} setRangeEnd={setRangeEnd} />}
          {currentView === 'planning' && <Planning user={user} transactions={transactions} goals={goals} budgets={budgets} onAddGoal={handleAddGoal} onDeleteGoal={handleDeleteGoal} onUpdateGoal={handleAddGoal} onAddBudget={handleAddBudget} onDeleteBudget={handleDeleteBudget} lang={lang} />}
          {currentView === 'investment' && <InvestmentPage user={user} lang={lang} />}
          {currentView === 'admin' && user.role === 'admin' && <AdminPanel user={user} lang={lang} />}
          
          {currentView === 'account' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
                    <div className="relative">
                        {user.avatar ? <img src={user.avatar} className="w-24 h-24 rounded-full border-4 border-indigo-50 dark:border-indigo-900/20 shadow-lg" /> : <div className="w-24 h-24 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-indigo-300 dark:text-indigo-600"><UserIcon size={48}/></div>}
                        <div className={`absolute bottom-1 right-1 border-4 border-white dark:border-slate-900 w-6 h-6 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    </div>
                    <h2 className="mt-4 text-2xl font-black text-slate-800 dark:text-white tracking-tight">{user.username}</h2>
                    <p className="text-slate-400 text-sm font-bold">{user.email || user.phone || 'ID: ' + user.id.slice(0,8)}</p>
                    <div className="mt-6 flex gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${user.role === 'admin' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                            {user.role === 'admin' ? 'Administrator' : 'Premium Member'}
                        </span>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cài đặt giao diện</h3>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg"><Globe size={18} /></div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Ngôn ngữ</span>
                            </div>
                            <select value={lang} onChange={e => setLang(e.target.value as Language)} className="text-sm font-black text-indigo-600 bg-transparent outline-none">
                                <option value="vi">Tiếng Việt</option>
                                <option value="en">English</option>
                                <option value="zh">中文</option>
                            </select>
                        </div>
                        <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg"><Smartphone size={18} /></div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Chế độ tối</span>
                            </div>
                            <button 
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className={`w-10 h-6 rounded-full relative transition-all ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDarkMode ? 'left-5' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                    <div className="p-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bảo mật & Hệ thống</h3>
                    </div>
                    <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        <button onClick={() => setCurrentView('investment')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg"><ShieldCheck size={18} /></div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Bảo mật cấp 2</span>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
                        </button>
                        {user.role === 'admin' && (
                            <button onClick={() => setCurrentView('admin')} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-indigo-600">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg"><Shield size={18} /></div>
                                    <span className="text-sm font-bold">Bảng quản trị</span>
                                </div>
                                <ChevronRight size={16} className="text-indigo-300 dark:text-indigo-700" />
                            </button>
                        )}
                        <button onClick={() => { setAiModalMode('image'); setIsAiModalOpen(true); }} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-lg"><Wand2 size={18} /></div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Quét hóa đơn AI</span>
                            </div>
                            <ChevronRight size={16} className="text-slate-300 dark:text-slate-600" />
                        </button>
                    </div>
                </div>

                <button onClick={handleLogout} className="w-full p-5 bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/30 text-rose-500 rounded-3xl font-black flex items-center justify-center gap-3 shadow-sm hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors">
                    <LogOut size={20} /> Đăng xuất khỏi thiết bị
                </button>

                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pb-10">Finance Manager v1.0.4 • Made with ❤️</p>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Navigation Bar with Centered FAB */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 px-2 py-1 flex items-center justify-around z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe transition-colors">
        <BottomNavItem view="dashboard" icon={LayoutDashboard} label={t.nav.dashboard} />
        <BottomNavItem view="analysis" icon={PieChart} label={t.nav.analysis} />
        
        {/* The Centered Add Button */}
        <div className="flex-1 flex justify-center -mt-8 relative h-full">
           <button 
             onClick={() => setIsManualModalOpen(true)}
             className="bg-indigo-600 text-white w-14 h-14 rounded-full shadow-2xl shadow-indigo-300 dark:shadow-none flex items-center justify-center hover:scale-110 active:scale-90 transition-all border-4 border-white dark:border-slate-900 z-[60]"
           >
             <Plus size={28} />
           </button>
           <div className="absolute top-8 w-16 h-16 bg-white dark:bg-slate-900 rounded-full -z-10 border-t border-slate-100 dark:border-slate-800 shadow-inner"></div>
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
