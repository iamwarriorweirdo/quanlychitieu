import React, { useState, useEffect } from 'react';
import { User, Investment, InvestmentSecurity } from '../types';
import { translations, Language } from '../utils/i18n';
import { Lock, Unlock, ShieldCheck, Plus, TrendingUp, TrendingDown, DollarSign, Activity, Trash2, RefreshCw } from 'lucide-react';
import { 
  checkSecurityStatus, setupSecurity, verifySecondaryPassword, requestOtp, 
  getInvestments, saveInvestment, deleteInvestment 
} from '../services/storageService';

interface Props {
  user: User;
  lang: Language;
}

export const InvestmentPage: React.FC<Props> = ({ user, lang }) => {
  const t = translations[lang];
  
  // Security State
  const [isLocked, setIsLocked] = useState(true);
  const [hasSetup, setHasSetup] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [serverOtp, setServerOtp] = useState(''); // To verify client side for demo
  const [error, setError] = useState('');

  // Data State
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [form, setForm] = useState<Partial<Investment>>({
    symbol: '', name: '', type: 'Stock', quantity: 0, buyPrice: 0, currentPrice: 0
  });

  // 1. Initial Check
  useEffect(() => {
    const check = async () => {
      const status = await checkSecurityStatus(user.id);
      setHasSetup(status.hasPassword);
      setUseOtp(status.isOtpEnabled);
      setSecurityLoading(false);
    };
    check();
  }, [user.id]);

  // 2. Load Investments when unlocked
  useEffect(() => {
    if (!isLocked) {
      const loadData = async () => {
        const data = await getInvestments(user.id);
        setInvestments(data);
      };
      loadData();
    }
  }, [isLocked, user.id]);

  // 3. Simulation Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isLocked && simulationEnabled && investments.length > 0) {
      interval = setInterval(() => {
        setInvestments(prev => prev.map(inv => {
          // Random fluctuation between -1% and +1%
          const change = (Math.random() - 0.5) * 0.02; 
          const newPrice = inv.currentPrice * (1 + change);
          return { ...inv, currentPrice: newPrice };
        }));
      }, 5000); // Update every 5 seconds
    }
    return () => clearInterval(interval);
  }, [isLocked, simulationEnabled, investments.length]);

  // Security Handlers
  const handleSetup = async () => {
    if (!passwordInput) return setError("Password required");
    await setupSecurity(user.id, passwordInput, useOtp ? emailInput : undefined);
    setHasSetup(true);
    setPasswordInput('');
    setIsLocked(true); // Require login immediately
  };

  const handleUnlock = async () => {
    setError('');
    const isValid = await verifySecondaryPassword(user.id, passwordInput);
    
    if (isValid) {
      if (useOtp && !otpSent) {
        // Trigger OTP flow
        const code = await requestOtp(user.id);
        setServerOtp(code);
        setOtpSent(true);
        alert(`DEMO OTP CODE: ${code}`); // Demo only
      } else if (useOtp && otpSent) {
        // Verify OTP
        if (otpInput === serverOtp) {
          setIsLocked(false);
        } else {
          setError("Invalid OTP");
        }
      } else {
        // No OTP needed
        setIsLocked(false);
      }
    } else {
      setError("Incorrect Password");
    }
  };

  // Investment CRUD Handlers
  const handleSave = async () => {
    if (!form.symbol || !form.quantity || !form.buyPrice) return;
    const newInv: Investment = {
      id: crypto.randomUUID(),
      userId: user.id,
      symbol: form.symbol!,
      name: form.name || form.symbol!,
      type: form.type as any,
      quantity: Number(form.quantity),
      buyPrice: Number(form.buyPrice),
      currentPrice: Number(form.currentPrice || form.buyPrice),
      date: new Date().toISOString()
    };
    const updated = await saveInvestment(user.id, newInv);
    setInvestments(updated);
    setIsModalOpen(false);
    setForm({ symbol: '', name: '', type: 'Stock', quantity: 0, buyPrice: 0, currentPrice: 0 });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this asset?")) {
      const updated = await deleteInvestment(user.id, id);
      setInvestments(updated);
    }
  };

  // Calculations
  const totalValue = investments.reduce((sum, i) => sum + (i.quantity * i.currentPrice), 0);
  const totalCost = investments.reduce((sum, i) => sum + (i.quantity * i.buyPrice), 0);
  const totalProfit = totalValue - totalCost;
  const profitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  if (securityLoading) return <div className="p-10 text-center"><RefreshCw className="animate-spin mx-auto"/></div>;

  // --- LOCKED VIEW (SETUP or LOGIN) ---
  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
           <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
             {hasSetup ? <Lock size={32} /> : <ShieldCheck size={32} />}
           </div>
           
           <h2 className="text-2xl font-bold text-slate-800 mb-2">
             {hasSetup ? t.investment.locked : t.investment.setup}
           </h2>
           
           {error && <div className="bg-rose-50 text-rose-600 p-2 text-sm rounded-lg mb-4">{error}</div>}

           <div className="space-y-4">
             {!hasSetup && (
               <>
                 <label className="flex items-center gap-2 text-sm text-slate-600 justify-center">
                   <input type="checkbox" checked={useOtp} onChange={e => setUseOtp(e.target.checked)} />
                   {t.investment.useOtp}
                 </label>
                 {useOtp && (
                   <input 
                     className="w-full p-3 border rounded-lg bg-slate-50"
                     placeholder={t.investment.email}
                     value={emailInput}
                     onChange={e => setEmailInput(e.target.value)}
                   />
                 )}
               </>
             )}

             {(!hasSetup || !otpSent) && (
               <input 
                 type="password"
                 className="w-full p-3 border rounded-lg bg-slate-50"
                 placeholder={hasSetup ? t.investment.enterPass : t.investment.setupPass}
                 value={passwordInput}
                 onChange={e => setPasswordInput(e.target.value)}
               />
             )}

             {hasSetup && otpSent && (
               <input 
                 className="w-full p-3 border rounded-lg bg-slate-50 text-center tracking-widest text-lg"
                 placeholder="######"
                 value={otpInput}
                 onChange={e => setOtpInput(e.target.value)}
               />
             )}

             <button 
               onClick={hasSetup ? handleUnlock : handleSetup}
               className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
             >
               {hasSetup ? <Unlock size={18} /> : <ShieldCheck size={18} />}
               {hasSetup ? (otpSent ? 'Verify OTP' : t.investment.unlock) : t.investment.setup}
             </button>
           </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD VIEW ---
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      
      {/* Header Stats */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t.investment.title}</h2>
          <div className="flex items-center gap-2 text-sm text-slate-500">
             <Activity size={14} className={simulationEnabled ? "text-emerald-500 animate-pulse" : ""} />
             <span>{t.investment.marketUpdate}: </span>
             <button 
               onClick={() => setSimulationEnabled(!simulationEnabled)}
               className={`font-semibold ${simulationEnabled ? "text-emerald-600" : "text-slate-400"}`}
             >
               {simulationEnabled ? "ON" : "OFF"}
             </button>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700">
           <Plus size={18} /> {t.investment.addAsset}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
            <p className="text-slate-400 text-sm font-medium mb-1">{t.investment.totalValue}</p>
            <h3 className="text-3xl font-bold tracking-tight">{totalValue.toLocaleString()} ₫</h3>
            <div className="mt-4 flex gap-4">
               <div>
                  <span className="text-xs text-slate-400">Invested</span>
                  <p className="font-semibold">{totalCost.toLocaleString()}</p>
               </div>
               <div>
                  <span className="text-xs text-slate-400">P/L %</span>
                  <p className={`font-semibold ${profitPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {profitPercent > 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                  </p>
               </div>
            </div>
         </div>

         <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
            <p className="text-slate-500 text-sm font-medium mb-2">{t.investment.totalProfit}</p>
            <h3 className={`text-4xl font-bold ${totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
               {totalProfit > 0 ? '+' : ''}{totalProfit.toLocaleString()} ₫
            </h3>
            <div className={`mt-2 p-1 rounded-full ${totalProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {totalProfit >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
         </div>
      </div>

      {/* Asset List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">{t.investment.symbol}</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">{t.investment.quantity}</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">{t.investment.currentPrice}</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Value</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">P/L</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {investments.map(inv => {
                const val = inv.quantity * inv.currentPrice;
                const cost = inv.quantity * inv.buyPrice;
                const pl = val - cost;
                const plPer = cost > 0 ? (pl / cost) * 100 : 0;
                
                return (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{inv.symbol}</div>
                      <div className="text-xs text-slate-500">{inv.name}</div>
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{inv.type}</span>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-700">{inv.quantity.toLocaleString()}</td>
                    <td className="p-4 text-sm">
                       <div className="font-medium">{inv.currentPrice.toLocaleString()}</div>
                       <div className="text-xs text-slate-400">Avg: {inv.buyPrice.toLocaleString()}</div>
                    </td>
                    <td className="p-4 font-bold text-slate-800">{val.toLocaleString()}</td>
                    <td className="p-4">
                       <div className={`font-bold ${pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                         {pl > 0 ? '+' : ''}{pl.toLocaleString()}
                       </div>
                       <div className={`text-xs ${plPer >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                         {plPer.toFixed(2)}%
                       </div>
                    </td>
                    <td className="p-4 text-right">
                       <button onClick={() => handleDelete(inv.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                );
              })}
              {investments.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">No assets in portfolio.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold mb-4">{t.investment.addAsset}</h3>
            <div className="space-y-3">
               <input 
                 className="w-full p-2 border rounded-lg" 
                 placeholder={t.investment.symbol}
                 value={form.symbol} 
                 onChange={e => setForm({...form, symbol: e.target.value.toUpperCase()})} 
               />
               <input 
                 className="w-full p-2 border rounded-lg" 
                 placeholder={t.investment.name}
                 value={form.name} 
                 onChange={e => setForm({...form, name: e.target.value})} 
               />
               <select 
                 className="w-full p-2 border rounded-lg"
                 value={form.type}
                 onChange={e => setForm({...form, type: e.target.value as any})}
               >
                 <option value="Stock">Stock</option>
                 <option value="Crypto">Crypto</option>
                 <option value="Gold">Gold</option>
                 <option value="RealEstate">Real Estate</option>
                 <option value="Fund">Fund</option>
                 <option value="Other">Other</option>
               </select>
               <div className="flex gap-2">
                 <input 
                   type="number" 
                   className="w-1/2 p-2 border rounded-lg"
                   placeholder={t.investment.quantity}
                   value={form.quantity || ''}
                   onChange={e => setForm({...form, quantity: Number(e.target.value)})}
                 />
                 <input 
                   type="number" 
                   className="w-1/2 p-2 border rounded-lg"
                   placeholder={t.investment.buyPrice}
                   value={form.buyPrice || ''}
                   onChange={e => setForm({...form, buyPrice: Number(e.target.value)})}
                 />
               </div>
               
               <div className="flex gap-2 mt-4">
                 <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 text-slate-500 bg-slate-100 rounded-lg">{t.manual.cancel}</button>
                 <button onClick={handleSave} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t.manual.save}</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};