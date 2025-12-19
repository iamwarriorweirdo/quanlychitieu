
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
import { Wallet, ArrowRight, Lock, User as UserIcon, Eye, EyeOff, Loader2, Globe, LayoutDashboard, PieChart, LogOut, Plus, Wand2, ClipboardList, TrendingUp, Mail, Phone, ShieldCheck, Lightbulb, Shield, Image as ImageIcon, Menu, X, MoreHorizontal } from 'lucide-react';
import { translations, Language } from './utils/i18n';

const GOOGLE_CLIENT_ID = "598430888470-bnchhoarr75hoas2rjbgn0ue54ud4i7k.apps.googleusercontent.com";

type View = 'dashboard' | 'analysis' | 'planning' | 'investment' | 'admin' | 'settings';

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
  const [showMobileMore, setShowMobileMore] = useState(false);

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
      onClick={() => { setCurrentView(view); setShowMobileMore(false); }} 
      className={`flex flex-col items-center gap-1 flex-1 py-2 transition-all ${currentView === view ? 'text-indigo-600' : 'text-slate-400'}`}
    >
      <Icon size={22} className={currentView === view ? 'scale-110' : ''} />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="p-6 flex items-center gap-3 border-b"><div className="bg-indigo-600 text-white p-2 rounded-lg"><Wallet /></div><h1 className="font-bold text-lg">{t.app.title}</h1></div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutDashboard size={20} />{t.nav.dashboard}</button>
          <button onClick={() => setCurrentView('analysis')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'analysis' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><PieChart size={20} />{t.nav.analysis}</button>
          <button onClick={() => setCurrentView('planning')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'planning' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><ClipboardList size={20} />{t.nav.planning}</button>
          <button onClick={() => setCurrentView('investment')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'investment' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><TrendingUp size={20} />{t.nav.investment}</button>
          {user.role === 'admin' && <button onClick={() => setCurrentView('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === 'admin' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Shield size={20} />{t.nav.admin}</button>}
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
        </div>
      </main>

      {/* Mobile Floating Action Button */}
      <div className="md:hidden fixed bottom-20 right-6 z-40">
        <button 
          onClick={() => setIsManualModalOpen(true)}
          className="bg-indigo-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all border-4 border-white"
        >
          <Plus size={28} />
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-2 py-1 flex items-center justify-around z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] pb-safe">
        <BottomNavItem view="dashboard" icon={LayoutDashboard} label={t.nav.dashboard} />
        <BottomNavItem view="analysis" icon={PieChart} label={t.nav.analysis} />
        <div className="flex-1 flex justify-center -mt-8 pointer-events-none">
           <div className="w-16 h-16 rounded-full bg-slate-50 border-t border-slate-100"></div>
        </div>
        <BottomNavItem view="planning" icon={ClipboardList} label={t.nav.planning} />
        <button 
          onClick={() => setShowMobileMore(!showMobileMore)} 
          className={`flex flex-col items-center gap-1 flex-1 py-2 transition-all ${showMobileMore ? 'text-indigo-600' : 'text-slate-400'}`}
        >
          <MoreHorizontal size={22} />
          <span className="text-[10px] font-bold">Khác</span>
        </button>
      </nav>

      {/* Mobile "More" Menu Overlay */}
      {showMobileMore && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setShowMobileMore(false)}>
          <div className="absolute bottom-20 left-4 right-4 bg-white rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
            <div className="grid grid-cols-3 gap-4">
              <button onClick={() => { setCurrentView('investment'); setShowMobileMore(false); }} className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center"><TrendingUp /></div>
                <span className="text-xs font-bold">{t.nav.investment}</span>
              </button>
              {user.role === 'admin' && (
                <button onClick={() => { setCurrentView('admin'); setShowMobileMore(false); }} className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center"><Shield /></div>
                  <span className="text-xs font-bold">{t.nav.admin}</span>
                </button>
              )}
              <button onClick={() => { setIsAiModalOpen(true); setShowMobileMore(false); }} className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center"><Wand2 /></div>
                <span className="text-xs font-bold">Quét AI</span>
              </button>
              <button onClick={handleLogout} className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-slate-50">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center"><LogOut /></div>
                <span className="text-xs font-bold">Thoát</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <AIParserModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} onSuccess={handleAddTransactions} initialMode={aiModalMode} lang={lang} />
      <ManualTransactionModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} onSave={d => handleAddTransactions([d])} lang={lang} />
    </div>
  );
};

export default App;
