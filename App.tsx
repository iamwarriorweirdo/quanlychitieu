
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
import { Wallet, ArrowRight, Lock, User as UserIcon, Eye, EyeOff, Loader2, Globe, LayoutDashboard, PieChart, LogOut, Plus, Wand2, ClipboardList, TrendingUp, Mail, Phone, ShieldCheck, Lightbulb, Shield, Image as ImageIcon } from 'lucide-react';
import { translations, Language } from './utils/i18n';

type View = 'dashboard' | 'analysis' | 'planning' | 'investment' | 'admin' | 'settings';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  
  // App Global State for Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  // App Global State for Filters
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [filterDate, setFilterDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [rangeStart, setRangeStart] = useState<string>(() => {
     const d = new Date(); d.setDate(1); return d.toLocaleDateString('en-CA');
  });
  const [rangeEnd, setRangeEnd] = useState<string>(new Date().toLocaleDateString('en-CA'));

  // Auth State
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const [error, setError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // UI State
  const [lang, setLang] = useState<Language>('vi');
  const [currentView, setCurrentView] = useState<View>('dashboard');
  
  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalMode, setAiModalMode] = useState<'text' | 'image'>('text');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [showMobileActionMenu, setShowMobileActionMenu] = useState(false);

  const t = translations[lang];

  // Initialize
  useEffect(() => {
    const init = async () => {
      await initDB().catch(console.error);
      const session = getCurrentSession();
      if (session) {
        setUser(session);
      }
      setIsInitializing(false);
    };
    init();
  }, []);

  // Initialize Google Login
  useEffect(() => {
    if (!user && !isInitializing) {
      /* global google */
      const handleCredentialResponse = async (response: any) => {
        setIsAuthLoading(true);
        setError('');
        try {
          const loggedInUser = await loginWithGoogle(response.credential);
          setUser(loggedInUser);
          setCurrentSession(loggedInUser);
        } catch (err: any) {
          setError("Google Login failed: " + err.message);
        } finally {
          setIsAuthLoading(false);
        }
      };

      // @ts-ignore
      if (window.google) {
        // @ts-ignore
        google.accounts.id.initialize({
          client_id: "878564070206-p69389n6p54r8f15gpksh8n2pvn12r7g.apps.googleusercontent.com", // This is a public client ID
          callback: handleCredentialResponse,
        });
        
        // @ts-ignore
        google.accounts.id.renderButton(
          document.getElementById("googleBtn"),
          { theme: "outline", size: "large", width: "100%", text: "continue_with" }
        );

        // @ts-ignore
        google.accounts.id.prompt(); // One Tap
      }
    }
  }, [user, isInitializing]);

  // Fetch transactions when user changes
  useEffect(() => {
    if (user?.id) {
      const fetchData = async () => {
        setIsLoadingTx(true);
        try {
          const [txData, goalData, budgetData] = await Promise.all([
            getTransactions(user.id),
            getGoals(user.id),
            getBudgets(user.id)
          ]);
          setTransactions(txData);
          setGoals(goalData);
          setBudgets(budgetData);
        } catch (error) {
          console.error("Failed to load data", error);
        } finally {
          setIsLoadingTx(false);
        }
      };
      fetchData();
    } else {
      setTransactions([]);
      setGoals([]);
      setBudgets([]);
    }
  }, [user?.id]);

  // Transaction Handlers
  const handleAddTransactions = async (dataList: ParsedTransactionData[]) => {
    if (!user) return;
    try {
      const promises = dataList.map(data => {
          const newTx: Transaction = {
            id: crypto.randomUUID(),
            userId: user.id,
            createdAt: Date.now(),
            ...data
          };
          return saveTransaction(user.id, newTx);
      });
      const results = await Promise.all(promises);
      if (results.length > 0) {
          setTransactions(results[results.length - 1]);
      }
    } catch (error) {
      alert(t.common.saveFailed);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (confirm(t.common.deleteConfirm)) {
      try {
        const updated = await deleteTransaction(user.id, id);
        setTransactions(updated);
      } catch (error) {
        alert(t.common.deleteFailed);
      }
    }
  };

  // Auth Handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setError(t.auth.errorUser);
      return;
    }
    if (!isLoginView && !(/[A-Z]/.test(passwordInput) && /\d/.test(passwordInput))) {
      setError(t.auth.errorPass);
      return;
    }

    setIsAuthLoading(true);
    try {
      if (isLoginView) {
        const loggedInUser = await loginUser(usernameInput, passwordInput);
        if (loggedInUser) {
          setUser(loggedInUser);
          setCurrentSession(loggedInUser);
        } else {
          setError(t.auth.errorLogin);
        }
      } else {
        const newUser = await registerUser(usernameInput, passwordInput, emailInput, phoneInput);
        setUser(newUser);
        setCurrentSession(newUser);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentSession(null);
    setUsernameInput('');
    setPasswordInput('');
    setEmailInput('');
    setPhoneInput('');
    setIsLoginView(true);
    setCurrentView('dashboard');
  };

  const handleAddGoal = async (goal: Goal) => { if (user) setGoals(await saveGoal(user.id, goal)); };
  const handleDeleteGoal = async (id: string) => { if (user && confirm('Delete?')) setGoals(await deleteGoal(user.id, id)); };
  const handleAddBudget = async (budget: Budget) => { if (user) setBudgets(await saveBudget(user.id, budget)); };
  const handleDeleteBudget = async (id: string) => { if (user && confirm('Delete?')) setBudgets(await deleteBudget(user.id, id)); };

  const openAiScan = (mode: 'text' | 'image' = 'text') => {
    setAiModalMode(mode);
    setIsAiModalOpen(true);
    setShowMobileActionMenu(false);
  };

  const openManualModal = () => {
    setIsManualModalOpen(true);
    setShowMobileActionMenu(false);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative">
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/80 backdrop-blur rounded-full px-3 py-1.5 shadow-sm border border-slate-200 z-10">
          <Globe size={14} className="text-slate-500" />
          <select value={lang} onChange={(e) => setLang(e.target.value as Language)} className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:ring-0 cursor-pointer outline-none">
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </div>

        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-indigo-600 p-8 text-center">
            <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <Wallet className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{t.app.title}</h1>
            <p className="text-indigo-100">{t.app.subtitle}</p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t.auth.username}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon size={18} className="text-slate-400" /></div>
                  <input type="text" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className="w-full pl-10 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder={t.auth.username} disabled={isAuthLoading} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t.auth.password}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock size={18} className="text-slate-400" /></div>
                  <input type={showPassword ? "text" : "password"} value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full pl-10 pr-10 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder={t.auth.password} disabled={isAuthLoading} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {!isLoginView && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-500">Bảo mật (Tùy chọn)</span></div></div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600"><div className="flex items-start gap-3 mb-2"><Lightbulb size={18} className="text-amber-500 shrink-0 mt-0.5" /><p><span className="font-semibold text-slate-800">Gợi ý:</span> Liên kết Email hoặc Số điện thoại giúp bạn bảo vệ tài khoản.</p></div></div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full pl-9 px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="Email" /></div>
                    <div className="relative"><Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="tel" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} className="w-full pl-9 px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="SĐT" /></div>
                  </div>
                </div>
              )}

              {error && <p className="text-rose-500 text-sm bg-rose-50 p-3 rounded-lg">{error}</p>}

              <button type="submit" disabled={isAuthLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4">
                {isAuthLoading ? <Loader2 className="animate-spin" size={18} /> : (
                  <><span>{isLoginView ? t.auth.login : t.auth.createAccount}</span><ArrowRight size={18} /></>
                )}
              </button>
            </form>
            
            <div className="mt-4 relative">
               <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
               <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">Hoặc</span></div>
            </div>

            <div id="googleBtn" className="mt-4 flex justify-center"></div>

            <div className="mt-6 text-center">
              <button onClick={() => { setIsLoginView(!isLoginView); setError(''); }} className="text-indigo-600 font-medium hover:underline text-sm">{isLoginView ? t.auth.newHere : t.auth.haveAccount}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-full fixed left-0 top-0 z-30">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100"><div className="bg-indigo-600 text-white p-2 rounded-lg"><Wallet size={24} /></div><h1 className="font-bold text-slate-800 text-lg">{t.app.title}</h1></div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutDashboard size={20} />{t.nav.dashboard}</button>
          <button onClick={() => setCurrentView('analysis')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === 'analysis' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><PieChart size={20} />{t.nav.analysis}</button>
          <button onClick={() => setCurrentView('planning')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === 'planning' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><ClipboardList size={20} />{t.nav.planning}</button>
          <button onClick={() => setCurrentView('investment')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === 'investment' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><TrendingUp size={20} />{t.nav.investment}</button>
          {user.role === 'admin' && (
            <button onClick={() => setCurrentView('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium ${currentView === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Shield size={20} />{t.nav.admin}</button>
          )}
        </nav>
        <div className="p-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-2 justify-center"><Globe size={14} className="text-slate-500" /><select value={lang} onChange={(e) => setLang(e.target.value as Language)} className="bg-transparent border-none text-xs font-semibold text-slate-700 focus:ring-0 outline-none cursor-pointer"><option value="vi">Tiếng Việt</option><option value="en">English</option><option value="zh">中文</option></select></div>
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-2 overflow-hidden">
                {user.avatar ? <img src={user.avatar} className="w-8 h-8 rounded-full border border-slate-200" alt="avatar" /> : <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><UserIcon size={16}/></div>}
                <div className="overflow-hidden"><span className="text-sm font-semibold text-slate-700 truncate max-w-[80px] block">{user.username}</span>{user.role === 'admin' && <span className="text-[10px] text-indigo-600 font-bold uppercase">Admin</span>}</div>
             </div>
             <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500"><LogOut size={20} /></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 h-full overflow-y-auto pt-20 md:pt-6 px-4 md:px-8 pb-24 md:pb-6 bg-slate-50">
         <div className="max-w-5xl mx-auto">
            {currentView === 'dashboard' && <Dashboard user={user} transactions={transactions} isLoading={isLoadingTx} onDelete={handleDelete} onTransactionsUpdated={setTransactions} lang={lang} openAiScan={openAiScan} openManualModal={openManualModal} filterMode={filterMode} setFilterMode={setFilterMode} filterDate={filterDate} setFilterDate={setFilterDate} rangeStart={rangeStart} setRangeStart={setRangeStart} rangeEnd={rangeEnd} setRangeEnd={setRangeEnd} />}
            {currentView === 'analysis' && <Analysis transactions={transactions} lang={lang} filterMode={filterMode} setFilterMode={setFilterMode} filterDate={filterDate} setFilterDate={setFilterDate} rangeStart={rangeStart} setRangeStart={setRangeStart} rangeEnd={rangeEnd} setRangeEnd={setRangeEnd} />}
            {currentView === 'planning' && <Planning user={user} transactions={transactions} goals={goals} budgets={budgets} onAddGoal={handleAddGoal} onDeleteGoal={handleDeleteGoal} onUpdateGoal={handleAddGoal} onAddBudget={handleAddBudget} onDeleteBudget={handleDeleteBudget} lang={lang} />}
            {currentView === 'investment' && <InvestmentPage user={user} lang={lang} />}
            {currentView === 'admin' && user.role === 'admin' && <AdminPanel user={user} lang={lang} />}
         </div>
      </main>

      {/* MOBILE NAV WITH ENHANCED ACTION MENU */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-violet-600 z-50 px-2 py-3 flex justify-around items-center h-20 shadow-[0_-4px_20px_rgba(124,58,237,0.3)]">
         <button onClick={() => setCurrentView('dashboard')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${currentView === 'dashboard' ? 'text-white' : 'text-violet-300'}`}><LayoutDashboard size={22} className={currentView === 'dashboard' ? 'scale-110' : ''} /><span className="text-[10px] font-medium opacity-90">{t.nav.dashboard}</span></button>
         <button onClick={() => setCurrentView('analysis')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${currentView === 'analysis' ? 'text-white' : 'text-violet-300'}`}><PieChart size={22} className={currentView === 'analysis' ? 'scale-110' : ''} /><span className="text-[10px] font-medium opacity-90">{t.nav.analysis}</span></button>
         
         {/* Center FAB with Action Menu */}
         <div className="relative w-16 flex-none">
            {showMobileActionMenu && (
               <div className="absolute -top-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200">
                  <button 
                    onClick={() => openAiScan('image')}
                    className="bg-white text-indigo-600 p-3 rounded-full shadow-xl flex items-center gap-2"
                  >
                    <ImageIcon size={20} />
                    <span className="text-xs font-bold pr-1">{t.dashboard.aiScan}</span>
                  </button>
                  <button 
                    onClick={openManualModal}
                    className="bg-indigo-600 text-white p-3 rounded-full shadow-xl flex items-center gap-2"
                  >
                    <Plus size={20} />
                    <span className="text-xs font-bold pr-1">Thêm tay</span>
                  </button>
               </div>
            )}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2">
              <button 
                onClick={() => setShowMobileActionMenu(!showMobileActionMenu)} 
                className={`bg-white text-violet-600 p-4 rounded-full shadow-2xl transition-all border-4 border-violet-600 ${showMobileActionMenu ? 'rotate-45' : ''}`}
              >
                <Plus size={28} strokeWidth={3} />
              </button>
            </div>
         </div>

         <button onClick={() => setCurrentView('planning')} className={`flex flex-col items-center gap-1 flex-1 transition-all ${currentView === 'planning' ? 'text-white' : 'text-violet-300'}`}><ClipboardList size={22} className={currentView === 'planning' ? 'scale-110' : ''} /><span className="text-[10px] font-medium opacity-90">{t.nav.planning}</span></button>
         <button onClick={() => (user.role === 'admin' ? setCurrentView('admin') : setCurrentView('investment'))} className={`flex flex-col items-center gap-1 flex-1 transition-all ${currentView === 'investment' || currentView === 'admin' ? 'text-white' : 'text-violet-300'}`}>
            {user.role === 'admin' ? <Shield size={22} /> : <TrendingUp size={22} />}
            <span className="text-[10px] font-medium opacity-90">{user.role === 'admin' ? t.nav.admin : t.nav.investment}</span>
         </button>
      </nav>

      {/* DESKTOP FABs - RE-ENFORCED WITH HIGH Z-INDEX */}
      <div className="hidden md:flex fixed bottom-8 right-8 flex-col gap-4 z-[100]">
         <button 
          onClick={() => openAiScan('image')}
          className="group flex items-center gap-2 bg-white text-indigo-600 border border-indigo-100 px-5 py-3 rounded-full shadow-lg hover:bg-indigo-50 transition-all"
        >
          <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />
          <span className="font-semibold">{t.dashboard.aiScan} (Ảnh/Bill)</span>
        </button>

        <button 
          onClick={openManualModal}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-4 rounded-full shadow-lg shadow-indigo-300 hover:bg-indigo-700 transition-all"
        >
          <Plus size={24} />
          <span className="font-semibold">{t.dashboard.quickAdd}</span>
        </button>
      </div>

      <AIParserModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} onSuccess={handleAddTransactions} initialMode={aiModalMode} lang={lang} />
      <ManualTransactionModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} onSave={(data) => handleAddTransactions([data])} lang={lang} />
      
      {/* Overlay for Mobile Action Menu */}
      {showMobileActionMenu && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[45] md:hidden" 
          onClick={() => setShowMobileActionMenu(false)}
        />
      )}
    </div>
  );
};

export default App;
