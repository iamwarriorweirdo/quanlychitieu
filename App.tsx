
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

/** 
 * THAY ĐỔI ID DƯỚI ĐÂY:
 * Lấy từ: Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client IDs
 */
const YOUR_GOOGLE_CLIENT_ID = "878564070206-p69389n6p54r8f15gpksh8n2pvn12r7g.apps.googleusercontent.com";

type View = 'dashboard' | 'analysis' | 'planning' | 'investment' | 'admin' | 'settings';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  
  // App Global State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);

  // Filter States
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
  
  const [lang, setLang] = useState<Language>('vi');
  const [currentView, setCurrentView] = useState<View>('dashboard');
  
  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalMode, setAiModalMode] = useState<'text' | 'image'>('text');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [showMobileActionMenu, setShowMobileActionMenu] = useState(false);

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

  // Google OAuth Initialization
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
          setError("Google Auth Failed: " + err.message);
        } finally {
          setIsAuthLoading(false);
        }
      };

      const startGSI = () => {
        // @ts-ignore
        if (window.google?.accounts?.id) {
          // @ts-ignore
          google.accounts.id.initialize({
            client_id: YOUR_GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false
          });
          
          const btn = document.getElementById("googleBtn");
          if (btn) {
            // @ts-ignore
            google.accounts.id.renderButton(btn, { 
              theme: "outline", 
              size: "large", 
              width: "100%", 
              text: "continue_with" 
            });
          }
          // @ts-ignore
          google.accounts.id.prompt();
        } else {
          setTimeout(startGSI, 300);
        }
      };
      startGSI();
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

  const handleLogout = () => { setUser(null); setCurrentSession(null); setCurrentView('dashboard'); };
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
              <button type="submit" disabled={isAuthLoading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 flex justify-center">
                {isAuthLoading ? <Loader2 className="animate-spin" /> : (isLoginView ? t.auth.login : t.auth.createAccount)}
              </button>
            </form>
            <div className="relative flex items-center py-2"><div className="flex-grow border-t"></div><span className="mx-3 text-slate-400 text-xs">OR</span><div className="flex-grow border-t"></div></div>
            <div id="googleBtn" className="flex justify-center min-h-[44px]"></div>
            <button onClick={() => setIsLoginView(!isLoginView)} className="w-full text-center text-indigo-600 text-sm font-medium hover:underline">{isLoginView ? t.auth.newHere : t.auth.haveAccount}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="p-6 flex items-center gap-3 border-b"><div className="bg-indigo-600 text-white p-2 rounded-lg"><Wallet /></div><h1 className="font-bold text-lg">{t.app.title}</h1></div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutDashboard size={20} />{t.nav.dashboard}</button>
          <button onClick={() => setCurrentView('analysis')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${currentView === 'analysis' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><PieChart size={20} />{t.nav.analysis}</button>
          <button onClick={() => setCurrentView('planning')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${currentView === 'planning' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><ClipboardList size={20} />{t.nav.planning}</button>
          <button onClick={() => setCurrentView('investment')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${currentView === 'investment' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><TrendingUp size={20} />{t.nav.investment}</button>
          {user.role === 'admin' && <button onClick={() => setCurrentView('admin')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${currentView === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}><Shield size={20} />{t.nav.admin}</button>}
        </nav>
        <div className="p-4 border-t flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">{user.avatar ? <img src={user.avatar} className="w-8 h-8 rounded-full" /> : <UserIcon size={20} />}<span className="text-sm font-bold truncate">{user.username}</span></div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500"><LogOut size={20} /></button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {currentView === 'dashboard' && <Dashboard user={user} transactions={transactions} isLoading={isLoadingTx} onDelete={handleDelete} onTransactionsUpdated={setTransactions} lang={lang} openAiScan={(m) => { setAiModalMode(m); setIsAiModalOpen(true); }} openManualModal={() => setIsManualModalOpen(true)} filterMode={filterMode} setFilterMode={setFilterMode} filterDate={filterDate} setFilterDate={setFilterDate} rangeStart={rangeStart} setRangeStart={setRangeStart} rangeEnd={rangeEnd} setRangeEnd={setRangeEnd} />}
          {currentView === 'analysis' && <Analysis transactions={transactions} lang={lang} filterMode={filterMode} setFilterMode={setFilterMode} filterDate={filterDate} setFilterDate={setFilterDate} rangeStart={rangeStart} setRangeStart={setRangeStart} rangeEnd={rangeEnd} setRangeEnd={setRangeEnd} />}
          {currentView === 'planning' && <Planning user={user} transactions={transactions} goals={goals} budgets={budgets} onAddGoal={handleAddGoal} onDeleteGoal={handleDeleteGoal} onUpdateGoal={handleAddGoal} onAddBudget={handleAddBudget} onDeleteBudget={handleDeleteBudget} lang={lang} />}
          {currentView === 'investment' && <InvestmentPage user={user} lang={lang} />}
          {currentView === 'admin' && user.role === 'admin' && <AdminPanel user={user} lang={lang} />}
        </div>
      </main>

      <AIParserModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} onSuccess={handleAddTransactions} initialMode={aiModalMode} lang={lang} />
      <ManualTransactionModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} onSave={d => handleAddTransactions([d])} lang={lang} />
    </div>
  );
};

export default App;
