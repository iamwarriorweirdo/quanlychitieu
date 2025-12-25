import React, { useState, useEffect } from 'react';
import { getCurrentSession, loginUser, registerUser, setCurrentSession, initDB, getTransactions, saveTransaction, deleteTransaction, getGoals, saveGoal, deleteGoal, getBudgets, saveBudget, deleteBudget, loginWithGoogle, syncOfflineData } from './services/storageService';
import { User, Transaction, ParsedTransactionData, Goal, Budget } from './types';
import { Dashboard } from './components/Dashboard';
import { Analysis } from './components/Analysis';
import { Planning } from './components/Planning';
import { InvestmentPage } from './components/Investment';
import { AIParserModal } from './components/AIParserModal';
import { ManualTransactionModal } from './components/ManualTransactionModal';
import { AdminPanel } from './components/AdminPanel';
import { FilterMode } from './components/DateFilter';
import { Wallet, LogOut, Plus, LayoutDashboard, PieChart, ClipboardList, TrendingUp, User as UserIcon, Globe, Smartphone, Loader2, CloudOff, AlertCircle, Shield, Clock, Banknote } from 'lucide-react';
import { translations, Language } from './utils/i18n';

// Client ID chính xác từ ảnh của bạn
const GOOGLE_CLIENT_ID = "598430888470-bnchhoarr75hoas2rjbgn0ue54ud4i7k.apps.googleusercontent.com";

type View = 'dashboard' | 'analysis' | 'planning' | 'investment' | 'admin' | 'settings' | 'account';
export type Currency = 'VND' | 'USD' | 'EUR' | 'JPY' | 'CNY' | 'KRW' | 'GBP';

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
  const [isLoginView, setIsLoginView] = useState(true);
  const [error, setError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalMode, setAiModalMode] = useState<'text' | 'image'>('text');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // --- PERSISTENT SETTINGS LOGIC ---

  // 1. Language Persistence
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved === 'en' || saved === 'zh' || saved === 'vi') ? saved : 'vi';
  });

  useEffect(() => {
    localStorage.setItem('app_lang', lang);
  }, [lang]);

  // 2. Currency Persistence
  const [currency, setCurrency] = useState<Currency>(() => 
    (localStorage.getItem('currency') as Currency) || 'VND'
  );

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  // 3. Timezone Persistence
  const [timezone, setTimezone] = useState<string>(() => 
    localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  useEffect(() => {
    localStorage.setItem('timezone', timezone);
  }, [timezone]);

  // Đã xóa logic Dark Mode để ứng dụng luôn ở chế độ sáng (Light Mode)

  // --- END SETTINGS LOGIC ---

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

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    const localeMap: Record<Currency, string> = {
      VND: 'vi-VN', USD: 'en-US', EUR: 'de-DE', JPY: 'ja-JP', CNY: 'zh-CN', KRW: 'ko-KR', GBP: 'en-GB'
    };
    return new Intl.NumberFormat(localeMap[currency], {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

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
          setError(`Lỗi backend: ${err.message || "Hãy kiểm tra Vercel Logs."}`);
        } finally {
          setIsAuthLoading(false);
        }
      };

      let retryCount = 0;
      const renderGoogleBtn = () => {
        const google = (window as any).google;
        if (google?.accounts?.id) {
          try {
            google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: handleCredentialResponse,
              auto_select: false,
              cancel_on_tap_outside: true,
              error_callback: (err: any) => {
                if (err.type === 'origin_mismatch') {
                  const currentOrigin = window.location.origin;
                  setError(`Google báo lỗi "mismatch origin". Hãy thêm chính xác "${currentOrigin}" vào mục "Authorized JavaScript origins" trong Google Cloud Console.`);
                }
              }
            });
            const btnContainer = document.getElementById("googleBtn");
            if (btnContainer) {
              google.accounts.id.renderButton(btnContainer, { 
                theme: "outline", size: "large", width: "320", text: "signin_with", shape: "pill"
              });
            }
          } catch (e: any) {
            console.error("Google Init Error:", e);
          }
        } else if (retryCount < 20) {
          retryCount++;
          setTimeout(renderGoogleBtn, 500);
        }
      };
      renderGoogleBtn();
    }
  }, [user, isInitializing, isOnline, isLoginView]);

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
    if (!isOnline && isLoginView) return setError(t.auth.networkError);
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
  const handleDeleteGoal = async (id: string) => { if (user && confirm(t.common.deleteConfirm)) setGoals(await deleteGoal(user.id, id)); };
  const handleAddBudget = async (b: Budget) => { if (user) setBudgets(await saveBudget(user.id, b)); };
  const handleDeleteBudget = async (id: string) => { if (user && confirm(t.common.deleteConfirm)) setBudgets(await deleteBudget(user.id, id)); };

  if (isInitializing) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600 w-10 h-10" /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 transition-colors duration-300">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-indigo-600 p-8 text-center text-white relative">
            {!isOnline && <div className="absolute top-4 right-4 text-white/50"><CloudOff size={16}/></div>}
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm"><Wallet className="w-8 h-8" /></div>
            <h1 className="text-2xl font-bold mb-1">{t.app.title}</h1>
            <p className="text-indigo-100 text-sm">{t.app.subtitle}</p>
          </div>
          <div className="p-8 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-xl flex gap-2 items-center border border-rose-100">
                <AlertCircle size={14} className="shrink-0" />
                <span className="leading-tight">{error}</span>
              </div>
            )}
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="text" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder={t.auth.username} />
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder={t.auth.password} />
              <button type="submit" disabled={isAuthLoading} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 flex justify-center transition-all active:scale-[0.98]">
                {isAuthLoading ? <Loader2 className="animate-spin" /> : (isLoginView ? t.auth.login : t.auth.createAccount)}
              </button>
            </form>
            <div className="relative py-2 flex items-center justify-center">
              <div className="border-t border-slate-200 w-full absolute"></div>
              <span className="bg-white px-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest relative z-10">hoặc</span>
            </div>
            <div id="googleBtn" className="flex justify-center min-h-[44px]"></div>
            <button onClick={() => setIsLoginView(!isLoginView)} className="w-full text-center text-indigo-600 text-sm font-bold hover:underline py-2">{isLoginView ? t.auth.newHere : t.auth.haveAccount}</button>
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
      <span className="text-[10px] font-black tracking-tight">{label}</span>
    </button>
  );

  const canAccessAdmin = user.role === 'admin' || user.role === 'superadmin';

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden transition-colors duration-300 text-slate-800">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 transition-colors">
        <div className="p-6 flex items-center gap-3 border-b">
          <div className="bg-indigo-600 text-white p-2 rounded-lg"><Wallet /></div>
          <h1 className="font-bold text-lg leading-tight">{t.app.title}</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutDashboard size={20} />{t.nav.dashboard}</button>
          <button onClick={() => setCurrentView('analysis')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'analysis' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><PieChart size={20} />{t.nav.analysis}</button>
          <button onClick={() => setCurrentView('planning')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'planning' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><ClipboardList size={20} />{t.nav.planning}</button>
          <button onClick={() => setCurrentView('investment')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'investment' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><TrendingUp size={20} />{t.nav.investment}</button>
          {canAccessAdmin && (
            <button onClick={() => setCurrentView('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'admin' ? 'bg-rose-50 text-rose-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Shield size={20} />{t.nav.admin}</button>
          )}
          <button onClick={() => setCurrentView('account')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'account' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><UserIcon size={20} />{t.nav.account}</button>
        </nav>
        <div className="p-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">{user.avatar ? <img src={user.avatar} className="w-8 h-8 rounded-full" alt="avatar" /> : <UserIcon size={16}/>}<span className="text-sm font-bold truncate text-slate-700">{user.username}</span></div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500"><LogOut size={20} /></button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto pb-24 md:p-8 pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-0">
          {!isOnline && (
             <div className="mb-4 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3">
                <CloudOff className="text-amber-600" size={20} />
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">{t.app.offlineMode}</p>
             </div>
          )}
          {currentView === 'dashboard' && <Dashboard user={user} transactions={transactions} isLoading={isLoadingTx} onDelete={handleDelete} onTransactionsUpdated={setTransactions} lang={lang} openAiScan={(m) => { setAiModalMode(m); setIsAiModalOpen(true); }} openManualModal={() => setIsManualModalOpen(true)} filterMode={filterMode} setFilterMode={setFilterMode} filterDate={filterDate} setFilterDate={setFilterDate} rangeStart={rangeStart} setRangeStart={setRangeStart} rangeEnd={rangeEnd} setRangeEnd={setRangeEnd} formatCurrency={formatCurrency} currency={currency} timezone={timezone} />}
          {currentView === 'analysis' && <Analysis transactions={transactions} lang={lang} filterMode={filterMode} setFilterMode={setFilterMode} filterDate={filterDate} setFilterDate={setFilterDate} rangeStart={rangeStart} setRangeStart={setRangeStart} rangeEnd={rangeEnd} setRangeEnd={setRangeEnd} formatCurrency={formatCurrency} />}
          {currentView === 'planning' && <Planning user={user} transactions={transactions} goals={goals} budgets={budgets} onAddGoal={handleAddGoal} onDeleteGoal={handleDeleteGoal} onUpdateGoal={handleAddGoal} onAddBudget={handleAddBudget} onDeleteBudget={handleDeleteBudget} lang={lang} formatCurrency={formatCurrency} />}
          {currentView === 'investment' && <InvestmentPage user={user} lang={lang} formatCurrency={formatCurrency} />}
          {currentView === 'admin' && <AdminPanel user={user} lang={lang} />}
          {currentView === 'account' && (
            <div className="space-y-6 pb-10">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                    <div className="relative">
                        {user.avatar ? <img src={user.avatar} className="w-24 h-24 rounded-full border-4 border-white shadow-lg" /> : <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-300"><UserIcon size={48}/></div>}
                        <div className={`absolute bottom-1 right-1 border-4 border-white w-6 h-6 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    </div>
                    <div className="flex flex-col items-center gap-1 mt-4">
                        <h2 className="text-2xl font-black text-slate-800">{user.username}</h2>
                        {user.role === 'superadmin' && (
                            <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-rose-200">Superadmin</span>
                        )}
                        {user.role === 'admin' && (
                            <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-black uppercase border border-indigo-200">Admin</span>
                        )}
                    </div>
                    <p className="text-slate-400 text-sm">{user.email || 'ID: ' + user.id.slice(0,8)}</p>
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden divide-y">
                    <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Globe size={18} /></div>
                            <span className="text-sm font-bold">{t.settings.language}</span>
                        </div>
                        <select value={lang} onChange={e => setLang(e.target.value as Language)} className="text-sm font-black text-indigo-600 bg-transparent outline-none cursor-pointer">
                          <option value="vi">Tiếng Việt</option>
                          <option value="en">English</option>
                          <option value="zh">中文</option>
                        </select>
                    </div>
                    {/* Đã xóa lựa chọn Chế độ tối (Dark Mode) */}
                    <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Banknote size={18} /></div>
                            <span className="text-sm font-bold">{t.settings.currency}</span>
                        </div>
                        <select value={currency} onChange={e => setCurrency(e.target.value as Currency)} className="text-sm font-black text-indigo-600 bg-transparent outline-none cursor-pointer">
                          <option value="VND">VND (₫)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="JPY">JPY (¥)</option>
                          <option value="CNY">CNY (¥)</option>
                          <option value="KRW">KRW (₩)</option>
                          <option value="GBP">GBP (£)</option>
                        </select>
                    </div>
                    <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg"><Clock size={18} /></div>
                            <span className="text-sm font-bold">{t.settings.timezone}</span>
                        </div>
                        <select value={timezone} onChange={e => setTimezone(e.target.value)} className="text-sm font-black text-indigo-600 bg-transparent outline-none cursor-pointer max-w-[150px]">
                          <option value="Asia/Ho_Chi_Minh">Vietnam (GMT+7)</option>
                          <option value="UTC">UTC (GMT+0)</option>
                          <option value="America/New_York">New York (EST)</option>
                          <option value="Europe/London">London (GMT)</option>
                          <option value="Asia/Tokyo">Tokyo (JST)</option>
                          <option value="Asia/Seoul">Seoul (KST)</option>
                          <option value="Asia/Shanghai">Shanghai (CST)</option>
                        </select>
                    </div>
                </div>
                <button onClick={handleLogout} className="w-full p-5 bg-white border border-rose-100 text-rose-500 rounded-3xl font-black shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"><LogOut size={20} /> {t.settings.logout}</button>
            </div>
          )}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-2 flex items-center justify-around z-50 pb-[env(safe-area-inset-bottom)] h-[calc(64px+env(safe-area-inset-bottom))] transition-colors">
        <BottomNavItem view="dashboard" icon={LayoutDashboard} label={t.nav.dashboard} />
        <BottomNavItem view="analysis" icon={PieChart} label={t.nav.analysis} />
        <div className="flex-1 flex justify-center -mt-8">
           <button onClick={() => setIsManualModalOpen(true)} className="bg-indigo-600 text-white w-14 h-14 rounded-full shadow-2xl shadow-indigo-300 flex items-center justify-center active:scale-90 transition-all border-4 border-white"><Plus size={28} /></button>
        </div>
        {canAccessAdmin ? (
            <BottomNavItem view="admin" icon={Shield} label={t.nav.admin} />
        ) : (
            <BottomNavItem view="planning" icon={ClipboardList} label={t.nav.planning} />
        )}
        <BottomNavItem view="account" icon={UserIcon} label={t.nav.me} />
      </nav>

      <AIParserModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} onSuccess={handleAddTransactions} initialMode={aiModalMode} lang={lang} />
      <ManualTransactionModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} onSave={d => handleAddTransactions([d])} lang={lang} />
    </div>
  );
};

export default App;