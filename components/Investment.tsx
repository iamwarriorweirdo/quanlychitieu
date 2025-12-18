
import React, { useState, useEffect } from 'react';
import { User, Investment, InvestmentSecurity } from '../types';
import { translations, Language } from '../utils/i18n';
import { Lock, Unlock, ShieldCheck, Plus, TrendingUp, TrendingDown, DollarSign, Activity, Trash2, RefreshCw, Settings, X, Calculator, Mail, CheckCircle2, Send, Server, AlertCircle, HelpCircle, CloudLightning } from 'lucide-react';
import { 
  checkSecurityStatus, setupSecurity, verifySecondaryPassword, requestOtp, verifyOtp,
  getInvestments, saveInvestment, deleteInvestment, fetchMarketPrices 
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
  const [hasSmtp, setHasSmtp] = useState(false);
  
  // Unlock / Login Inputs
  const [passwordInput, setPasswordInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Settings Modal Inputs
  const [newPassword, setNewPassword] = useState('');
  const [linkEmailInput, setLinkEmailInput] = useState('');
  const [linkOtpInput, setLinkOtpInput] = useState('');
  const [isLinkingEmail, setIsLinkingEmail] = useState(false);
  const [isWaitingOtp, setIsWaitingOtp] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | undefined>(undefined);
  
  // SMTP Config Inputs
  const [smtpEmail, setSmtpEmail] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);

  const [error, setError] = useState('');

  // Data State
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
  const [form, setForm] = useState<Partial<Investment>>({
    symbol: '', name: '', type: 'Stock', quantity: 0, buyPrice: 0, currentPrice: 0, unit: ''
  });

  const BASE_URL = (import.meta as any).env?.BASE_URL || '/';
  const CLEAN_BASE_URL = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  const API_URL = `${CLEAN_BASE_URL}/api`;

  const checkStatus = async () => {
    try {
        const res = await fetch(`${API_URL}/security`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'check_status', userId: user.id })
        });
        const status = await res.json();
        setHasSetup(status.hasPassword);
        setHasSmtp(status.hasSmtp);
        if (status.email) {
            setCurrentEmail(status.email);
            setLinkEmailInput(status.email);
        }
    } catch (e) { console.error(e); }
    setSecurityLoading(false);
  };

  useEffect(() => {
    checkStatus();
  }, [user.id]);

  useEffect(() => {
    if (!isLocked) {
      const loadData = async () => {
        const data = await getInvestments(user.id);
        setInvestments(data);
      };
      loadData();
    }
  }, [isLocked, user.id]);

  const handleInitialSetup = async () => {
    if (!passwordInput) return setError("Password required");
    await setupSecurity(user.id, passwordInput);
    setHasSetup(true);
    setPasswordInput('');
    setIsLocked(true); 
    checkStatus();
  };

  const handleUnlock = async () => {
    setError('');
    if (!otpSent) {
        const isValid = await verifySecondaryPassword(user.id, passwordInput);
        if (isValid) {
            const status = await checkSecurityStatus(user.id);
            if (status.isOtpEnabled && status.email) {
                setSecurityLoading(true);
                try {
                   await requestOtp(user.id);
                   setOtpSent(true);
                   alert(`Mã OTP đã được gửi đến email ${status.email}.`);
                } catch (err: any) {
                   setError(err.message);
                   if (err.message && err.message.includes("cấu hình")) {
                       setIsSecurityModalOpen(true);
                       setShowSmtpConfig(true);
                   }
                } finally {
                   setSecurityLoading(false);
                }
            } else {
                setIsLocked(false);
            }
        } else {
            setError("Incorrect Password");
        }
        return;
    }

    if (otpSent) {
        setSecurityLoading(true);
        const isValidOtp = await verifyOtp(user.id, otpInput);
        setSecurityLoading(false);
        if (isValidOtp) setIsLocked(false);
        else setError("Invalid OTP");
    }
  };

  const handleUpdatePassword = async () => {
      if(!newPassword) return;
      await setupSecurity(user.id, newPassword);
      setNewPassword('');
      alert("Password updated!");
  };

  const handleSaveSmtp = async () => {
      if(!smtpEmail || !smtpPass) return alert("Vui lòng nhập đầy đủ Email và Mật khẩu ứng dụng.");
      try {
        const res = await fetch(`${API_URL}/security`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'setup_smtp', userId: user.id, smtpEmail, smtpPassword: smtpPass })
        });
        if(!res.ok) throw new Error("Failed to save");
        alert("Cấu hình Email gửi thành công!");
        setShowSmtpConfig(false);
        checkStatus();
      } catch(e) {
        alert("Lưu thất bại.");
      }
  };

  const handleSendLinkOtp = async () => {
      if (!linkEmailInput) return;
      setIsLinkingEmail(true);
      try {
         await requestOtp(user.id, linkEmailInput);
         setIsWaitingOtp(true);
         alert(t.investment.otpSent);
      } catch (err: any) {
         alert(err.message);
         if (err.message && err.message.includes("cấu hình")) {
             setShowSmtpConfig(true);
         }
      } finally {
         setIsLinkingEmail(false);
      }
  };

  const handleVerifyLinkOtp = async () => {
      const isValid = await verifyOtp(user.id, linkOtpInput);
      if (isValid) {
          await setupSecurity(user.id, undefined, linkEmailInput);
          setCurrentEmail(linkEmailInput);
          setIsWaitingOtp(false);
          setLinkOtpInput('');
          alert("Email linked & OTP Enabled!");
          checkStatus();
      } else {
          alert("Invalid OTP");
      }
  };

  const handleSave = async () => {
    if (!form.symbol || !form.quantity || !form.buyPrice) return;
    const newInv: Investment = {
      id: crypto.randomUUID(),
      userId: user.id,
      symbol: form.symbol!,
      name: form.name || form.symbol!,
      type: form.type as any,
      quantity: Number(form.quantity),
      unit: form.unit,
      buyPrice: Number(form.buyPrice),
      currentPrice: Number(form.currentPrice || form.buyPrice),
      date: new Date().toISOString()
    };
    const updated = await saveInvestment(user.id, newInv);
    setInvestments(updated);
    setIsModalOpen(false);
    setForm({ symbol: '', name: '', type: 'Stock', quantity: 0, buyPrice: 0, currentPrice: 0, unit: '' });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this asset?")) {
      const updated = await deleteInvestment(user.id, id);
      setInvestments(updated);
    }
  };

  const handleUpdatePrices = async () => {
    if (investments.length === 0) return;
    setIsUpdatingPrices(true);
    const symbols = Array.from(new Set(investments.map(i => i.symbol))) as string[];
    try {
       const prices = await fetchMarketPrices(symbols);
       const updatedInvestments = investments.map(inv => {
           if (prices[inv.symbol]) return { ...inv, currentPrice: prices[inv.symbol] };
           return inv;
       });
       setInvestments(updatedInvestments);
       updatedInvestments.forEach(inv => { if (prices[inv.symbol]) saveInvestment(user.id, inv); });
       alert("Cập nhật giá thành công!");
    } catch (err) {
       alert("Không thể cập nhật giá.");
    } finally {
       setIsUpdatingPrices(false);
    }
  };

  const totalValue = investments.reduce((sum, i) => sum + (i.quantity * i.currentPrice), 0);
  const totalCost = investments.reduce((sum, i) => sum + (i.quantity * i.buyPrice), 0);
  const totalProfit = totalValue - totalCost;
  const profitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
  
  const getEstimatedTotal = () => (Number(form.quantity) || 0) * (Number(form.buyPrice) || 0);

  if (securityLoading) return <div className="p-10 text-center"><RefreshCw className="animate-spin mx-auto text-indigo-600 mb-2"/> <p className="text-slate-500 text-sm">Verifying...</p></div>;

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
           <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
             {hasSetup ? <Lock size={32} /> : <ShieldCheck size={32} />}
           </div>
           <h2 className="text-2xl font-bold text-slate-800 mb-2">{hasSetup ? t.investment.locked : t.investment.setup}</h2>
           {error && <div className="bg-rose-50 text-rose-600 p-2 text-sm rounded-lg mb-4">{error}</div>}
           <div className="space-y-4">
             {(!hasSetup || !otpSent) && (
               <input type="password" className="w-full p-3 border rounded-lg bg-slate-50 outline-none" placeholder={hasSetup ? t.investment.enterPass : t.investment.setupPass} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
             )}
             {hasSetup && otpSent && (
               <div className="animate-in fade-in slide-in-from-bottom-2">
                 <p className="text-sm text-slate-500 mb-2">{t.investment.enterCode}: <br/><span className="font-bold text-slate-700">{currentEmail}</span></p>
                 <input className="w-full p-3 border rounded-lg bg-slate-50 text-center tracking-widest text-lg outline-none" placeholder="######" value={otpInput} onChange={e => setOtpInput(e.target.value)} />
               </div>
             )}
             <button onClick={hasSetup ? handleUnlock : handleInitialSetup} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
               {hasSetup ? <Unlock size={18} /> : <ShieldCheck size={18} />}
               {hasSetup ? (otpSent ? t.investment.verify : t.investment.unlock) : t.investment.setup}
             </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t.investment.title}</h2>
          <div className="flex items-center gap-2 text-sm text-slate-500">
             <Activity size={14} className={isUpdatingPrices ? "text-indigo-500 animate-spin" : "text-emerald-500"} />
             <span>{t.investment.marketUpdate}: </span>
             <button onClick={handleUpdatePrices} disabled={isUpdatingPrices} className="font-semibold text-indigo-600 hover:underline">
               {isUpdatingPrices ? "Updating..." : t.investment.updatePrices} <CloudLightning size={14} className="inline ml-1" />
             </button>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setIsSecurityModalOpen(true)} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-200">
               <Settings size={18} />
           </button>
           <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:bg-indigo-700">
              <Plus size={18} /> {t.investment.addAsset}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
            <p className="text-slate-400 text-sm mb-1">{t.investment.totalValue}</p>
            <h3 className="text-3xl font-bold">{totalValue.toLocaleString('vi-VN')} ₫</h3>
            <div className="mt-4 flex gap-4">
               <div><span className="text-xs text-slate-400">Invested</span><p className="font-semibold">{totalCost.toLocaleString('vi-VN')}</p></div>
               <div><span className="text-xs text-slate-400">P/L %</span><p className={`font-semibold ${profitPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{profitPercent > 0 ? '+' : ''}{profitPercent.toFixed(2)}%</p></div>
            </div>
         </div>
         <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center items-center">
            <p className="text-slate-500 text-sm mb-2">{t.investment.totalProfit}</p>
            <h3 className={`text-4xl font-bold ${totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{totalProfit > 0 ? '+' : ''}{totalProfit.toLocaleString('vi-VN')} ₫</h3>
         </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">{t.investment.symbol}</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">{t.investment.quantity}</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">{t.investment.currentPrice}</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Value</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">P/L</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {investments.map(inv => {
                const val = inv.quantity * inv.currentPrice;
                const cost = inv.quantity * inv.buyPrice;
                const pl = val - cost;
                const plPer = cost > 0 ? (pl / cost) * 100 : 0;
                const typeLabel = (t.investment.types as Record<string, string>)[inv.type] || inv.type;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{inv.symbol}</div>
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{typeLabel}</span>
                    </td>
                    <td className="p-4 text-sm">{inv.quantity.toLocaleString('vi-VN')} <span className="text-slate-400 text-xs">{inv.unit}</span></td>
                    <td className="p-4 text-sm"><div className="font-medium">{inv.currentPrice.toLocaleString('vi-VN')}</div></td>
                    <td className="p-4 font-bold">{val.toLocaleString('vi-VN')}</td>
                    <td className="p-4">
                       <div className={`font-bold ${pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{pl > 0 ? '+' : ''}{pl.toLocaleString('vi-VN')}</div>
                       <div className={`text-xs ${plPer >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{plPer.toFixed(2)}%</div>
                    </td>
                    <td className="p-4 text-right"><button onClick={() => handleDelete(inv.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isSecurityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{t.investment.manageSecurity}</h3>
              <button onClick={() => setIsSecurityModalOpen(false)} className="text-slate-400"><X size={20}/></button>
            </div>
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border">
                 <div className="flex items-center gap-2 mb-3">
                    <div className={`p-2 rounded-full ${currentEmail ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}><Mail size={18} /></div>
                    <div><h4 className="text-sm font-bold">{t.investment.linkGmail}</h4><p className="text-xs text-slate-500">{currentEmail || 'Not linked'}</p></div>
                    {currentEmail && <CheckCircle2 size={16} className="text-emerald-500 ml-auto" />}
                 </div>
                 <div className="space-y-2">
                    {!isWaitingOtp ? (
                        <div className="flex gap-2">
                           <input className="flex-1 p-2 text-sm border rounded-lg outline-none" placeholder="abc@gmail.com" value={linkEmailInput} onChange={e => setLinkEmailInput(e.target.value)} />
                           <button onClick={handleSendLinkOtp} disabled={isLinkingEmail} className="bg-indigo-600 text-white p-2 rounded-lg">{isLinkingEmail ? <RefreshCw className="animate-spin w-4 h-4"/> : <Send size={16} />}</button>
                        </div>
                    ) : (
                        <div className="space-y-2 animate-in fade-in">
                           <p className="text-xs text-indigo-600 font-medium text-center">Mã OTP đã được gửi!</p>
                           <input className="w-full p-2 text-center text-sm border rounded-lg tracking-widest" placeholder="000000" value={linkOtpInput} onChange={e => setLinkOtpInput(e.target.value)} />
                           <button onClick={handleVerifyLinkOtp} className="w-full bg-emerald-600 text-white p-2 rounded-lg text-sm font-bold">Xác thực & Liên kết</button>
                           <button onClick={() => setIsWaitingOtp(false)} className="w-full text-xs text-slate-400">Hủy</button>
                        </div>
                    )}
                 </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border">
                 <button onClick={() => setShowSmtpConfig(!showSmtpConfig)} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-full ${hasSmtp ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}><Server size={18} /></div>
                        <div><h4 className="text-sm font-bold text-left">Cấu hình Email gửi (Tùy chọn)</h4><p className="text-xs text-slate-500 text-left">{hasSmtp ? 'Đã cấu hình' : 'Mặc định: Hệ thống'}</p></div>
                    </div>
                 </button>
                 {showSmtpConfig && (
                     <div className="mt-3 space-y-3 animate-in slide-in-from-top-2">
                        <div className="bg-amber-50 p-2 rounded text-[10px] text-amber-700 flex items-start gap-2">
                            <AlertCircle size={14} className="shrink-0 mt-0.5" /><p>Dùng Gmail cá nhân để gửi OTP. Bắt buộc dùng <b>Mật khẩu ứng dụng</b>.</p>
                        </div>
                        <input className="w-full p-2 text-sm border rounded-lg" placeholder="Gmail gửi" value={smtpEmail} onChange={e => setSmtpEmail(e.target.value)} />
                        <input type="password"  className="w-full p-2 text-sm border rounded-lg" placeholder="Mật khẩu ứng dụng (16 ký tự)" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} />
                        <button onClick={handleSaveSmtp} className="w-full bg-slate-800 text-white py-2 rounded-lg text-xs font-bold">Lưu cấu hình</button>
                     </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
