
import React, { useState, useEffect } from 'react';
import { User, Investment, InvestmentSecurity } from '../types';
import { translations, Language } from '../utils/i18n';
import { Lock, Unlock, ShieldCheck, Plus, TrendingUp, TrendingDown, DollarSign, Activity, Trash2, RefreshCw, Settings, X, Calculator, Mail, CheckCircle2, Send, Server, AlertCircle, HelpCircle, CloudLightning, ExternalLink, Key, ShieldAlert, BarChart3, Briefcase, GraduationCap } from 'lucide-react';
import { 
  checkSecurityStatus, setupSecurity, verifySecondaryPassword, requestOtp, verifyOtp,
  getInvestments, saveInvestment, deleteInvestment, fetchMarketPrices 
} from '../services/storageService';
import { Capacitor } from '@capacitor/core';

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
  
  // Form State for Adding Asset
  const [form, setForm] = useState<Partial<Investment>>({
    symbol: '', name: '', type: 'Stock', quantity: 0, buyPrice: 0, currentPrice: 0, unit: ''
  });

  const PRODUCTION_DOMAIN = 'https://quanlychitieu-dusky.vercel.app';
  const API_URL = Capacitor.isNativePlatform() ? `${PRODUCTION_DOMAIN}/api` : '/api';

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
    if (!passwordInput) return setError("Vui lòng nhập mật khẩu cấp 2.");
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
                   if (err.message && (err.message.includes("cấu hình") || err.message.includes("xác thực"))) {
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
            setError("Mật khẩu cấp 2 không chính xác.");
        }
        return;
    }

    if (otpSent) {
        setSecurityLoading(true);
        const isValidOtp = await verifyOtp(user.id, otpInput);
        setSecurityLoading(false);
        if (isValidOtp) setIsLocked(false);
        else setError("Mã OTP không chính xác.");
    }
  };

  const handleSendLinkOtp = async () => {
    if (!linkEmailInput || !linkEmailInput.includes('@')) return alert("Vui lòng nhập Email hợp lệ.");
    setIsLinkingEmail(true);
    try {
        const res = await requestOtp(user.id, linkEmailInput);
        if (res.success) {
            setIsWaitingOtp(true);
            alert("Mã xác thực đã được gửi!");
        } else {
            alert(res.error || "Gửi mã thất bại.");
        }
    } catch(e: any) { alert(e.message); }
    finally { setIsLinkingEmail(false); }
  };

  const handleVerifyLinkOtp = async () => {
    if (!linkOtpInput) return alert("Vui lòng nhập mã OTP.");
    try {
        const ok = await verifyOtp(user.id, linkOtpInput);
        if (ok) {
            await setupSecurity(user.id, '', linkEmailInput);
            alert("Liên kết thành công!");
            setIsWaitingOtp(false);
            setLinkOtpInput('');
            checkStatus();
        } else {
            alert("Mã OTP không chính xác.");
        }
    } catch(e: any) { alert(e.message); }
  };

  const handleSaveSmtp = async () => {
      const cleanPass = smtpPass.trim().replace(/\s/g, '');
      if(!smtpEmail || !cleanPass) return alert("Vui lòng nhập đầy đủ Email và Mật khẩu ứng dụng.");
      if(cleanPass.length !== 16) return alert("Lỗi: Mật khẩu ứng dụng Google phải có đúng 16 ký tự viết liền.");

      try {
        const res = await fetch(`${API_URL}/security`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'setup_smtp', userId: user.id, smtpEmail, smtpPassword: cleanPass })
        });
        if(!res.ok) throw new Error("Failed to save");
        alert("Cấu hình thành công!");
        setShowSmtpConfig(false);
        checkStatus();
      } catch(e) { alert("Lưu thất bại."); }
  };

  const handleSave = async () => {
    // Validation: 
    // Stocks and Crypto MUST have symbol
    // Gold and Education Fund only need Name
    const isTickerRequired = form.type === 'Stock' || form.type === 'Crypto' || form.type === 'Fund';
    
    if (isTickerRequired && !form.symbol) {
      alert("Loại tài sản này bắt buộc phải có Mã tài sản.");
      return;
    }
    
    if (!form.name && !form.symbol) {
      alert("Vui lòng nhập tên hoặc mã tài sản.");
      return;
    }
    
    if (!form.quantity || !form.buyPrice) {
      alert("Vui lòng nhập đầy đủ số lượng và giá mua.");
      return;
    }
    
    try {
      const newInv: Investment = {
        id: crypto.randomUUID(),
        userId: user.id,
        symbol: form.symbol?.toUpperCase() || '',
        name: form.name || form.symbol || '',
        type: form.type as any,
        quantity: Number(form.quantity),
        unit: form.unit || '',
        buyPrice: Number(form.buyPrice),
        currentPrice: Number(form.currentPrice || form.buyPrice),
        date: new Date().toISOString()
      };
      
      const updated = await saveInvestment(user.id, newInv);
      setInvestments(updated);
      setIsModalOpen(false);
      setForm({ symbol: '', name: '', type: 'Stock', quantity: 0, buyPrice: 0, currentPrice: 0, unit: '' });
      alert("Đã lưu tài sản.");
    } catch (e) {
      alert("Không thể lưu tài sản.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Xóa tài sản này khỏi danh mục?")) {
      const updated = await deleteInvestment(user.id, id);
      setInvestments(updated);
    }
  };

  const handleUpdatePrices = async () => {
    if (investments.length === 0) return;
    setIsUpdatingPrices(true);
    // Only update for items with tickers
    const symbols = Array.from(new Set(investments.filter(i => !!i.symbol).map(i => i.symbol!))) as string[];
    
    try {
       const prices = await fetchMarketPrices(symbols);
       const updatedInvestments = investments.map(inv => {
           if (inv.symbol && prices[inv.symbol]) return { ...inv, currentPrice: prices[inv.symbol] };
           return inv;
       });
       setInvestments(updatedInvestments);
       for (const inv of updatedInvestments) {
          if (inv.symbol && prices[inv.symbol]) await saveInvestment(user.id, inv);
       }
       alert("Cập nhật giá thành công!");
    } catch (err) {
       alert("Không thể cập nhật giá tự động.");
    } finally {
       setIsUpdatingPrices(false);
    }
  };

  const totalValue = investments.reduce((sum, i) => sum + (i.quantity * i.currentPrice), 0);
  const totalCost = investments.reduce((sum, i) => sum + (i.quantity * i.buyPrice), 0);
  const totalProfit = totalValue - totalCost;
  const profitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  if (securityLoading) return <div className="p-10 text-center"><RefreshCw className="animate-spin mx-auto text-indigo-600 mb-2"/> <p className="text-slate-500 text-sm">Đang xác thực bảo mật...</p></div>;

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
           <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
             {hasSetup ? <Lock size={32} /> : <ShieldCheck size={32} />}
           </div>
           <h2 className="text-2xl font-bold text-slate-800 mb-2">{hasSetup ? t.investment.locked : t.investment.setup}</h2>
           {error && <div className="bg-rose-50 text-rose-600 p-3 text-sm rounded-lg mb-4 text-left border border-rose-100">{error}</div>}
           <div className="space-y-4">
             {(!hasSetup || !otpSent) && (
               <input type="password" title="Password Input" className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder={hasSetup ? t.investment.enterPass : t.investment.setupPass} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
             )}
             {hasSetup && otpSent && (
               <div className="animate-in fade-in slide-in-from-bottom-2">
                 <p className="text-sm text-slate-500 mb-2">Nhập mã xác thực đã gửi đến: <br/><span className="font-bold text-slate-700">{currentEmail}</span></p>
                 <input title="OTP Input" className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 text-center tracking-widest text-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="000000" value={otpInput} onChange={e => setOtpInput(e.target.value)} maxLength={6} />
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
               {isUpdatingPrices ? "Đang cập nhật..." : t.investment.updatePrices} <CloudLightning size={14} className="inline ml-1" />
             </button>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setIsSecurityModalOpen(true)} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-200">
               <Settings size={18} />
           </button>
           <button onClick={() => {
               setForm({ symbol: '', name: '', type: 'Stock', quantity: 0, buyPrice: 0, currentPrice: 0, unit: '' });
               setIsModalOpen(true);
           }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:bg-indigo-700">
              <Plus size={18} /> {t.investment.addAsset}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
            <p className="text-slate-400 text-sm mb-1">{t.investment.totalValue}</p>
            <h3 className="text-3xl font-bold">{totalValue.toLocaleString('vi-VN')} ₫</h3>
            <div className="mt-4 flex gap-4">
               <div><span className="text-xs text-slate-400">Vốn đầu tư</span><p className="font-semibold">{totalCost.toLocaleString('vi-VN')}</p></div>
               <div><span className="text-xs text-slate-400">P/L %</span><p className={`font-semibold ${profitPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{profitPercent > 0 ? '+' : ''}{profitPercent.toFixed(2)}%</p></div>
            </div>
         </div>
         <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-center items-center">
            <p className="text-slate-500 text-sm mb-2">{t.investment.totalProfit}</p>
            <h3 className={`text-4xl font-bold ${totalProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{totalProfit > 0 ? '+' : ''}{totalProfit.toLocaleString('vi-VN')} ₫</h3>
         </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">{t.investment.symbol}</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">{t.investment.quantity}</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">{t.investment.currentPrice}</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Giá trị</th>
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
                      <div className="font-bold text-slate-800">{inv.symbol || inv.name}</div>
                      <div className="text-[10px] flex items-center gap-1">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{typeLabel}</span>
                        {inv.symbol && <span className="text-slate-400 italic">{inv.name}</span>}
                      </div>
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
              {investments.length === 0 && (
                <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 italic">Chưa có tài sản trong danh mục.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD ASSET (UPGRADED) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
           <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in border border-slate-100 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold flex items-center gap-2">
                    {form.type === 'Gold' ? <Calculator className="text-amber-500" /> : 
                     form.type === 'EducationFund' ? <GraduationCap className="text-indigo-600" /> :
                     <Briefcase className="text-indigo-600" />} 
                    {t.investment.addAsset}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Loại tài sản</label>
                    <select className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={form.type} onChange={e => {
                        const newType = e.target.value as any;
                        let unit = '';
                        if(newType === 'Gold') unit = 'Chỉ';
                        if(newType === 'Stock') unit = 'CP';
                        if(newType === 'EducationFund') unit = 'Kỳ';
                        setForm({...form, type: newType, unit});
                    }}>
                       {Object.entries(t.investment.types).map(([k, v]) => (
                          <option key={k} value={k}>{v as string}</option>
                       ))}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    {/* Only show Ticker for specific types */}
                    {(form.type === 'Stock' || form.type === 'Crypto' || form.type === 'Fund') ? (
                       <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Mã (VIC, BTC...)</label>
                          <input className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="VD: VIC" value={form.symbol} onChange={e => setForm({...form, symbol: e.target.value})} />
                       </div>
                    ) : null}
                    
                    <div className={(form.type === 'Stock' || form.type === 'Crypto' || form.type === 'Fund') ? "" : "col-span-2"}>
                       <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">
                          {form.type === 'Gold' ? 'Tên loại vàng (SJC, 9999...)' : 
                           form.type === 'EducationFund' ? 'Tên quỹ / Ngân hàng' : 'Tên tài sản'}
                       </label>
                       <input className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder={form.type === 'Gold' ? "VD: SJC" : "VD: VinGroup"} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">
                          {form.type === 'EducationFund' ? 'Số tiền đóng góp' : 'Số lượng'}
                       </label>
                       <input type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" value={form.quantity || ''} onChange={e => setForm({...form, quantity: Number(e.target.value)})} />
                    </div>
                    <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Đơn vị</label>
                       {form.type === 'Gold' ? (
                           <select className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                               <option value="Chỉ">Chỉ</option>
                               <option value="Lượng">Lượng</option>
                           </select>
                       ) : (
                           <input className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="VD: CP" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
                       )}
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">
                       {form.type === 'EducationFund' ? 'Giá trị hiện tại' : 'Giá mua trung bình (VNĐ)'}
                    </label>
                    <input type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" value={form.buyPrice || ''} onChange={e => setForm({...form, buyPrice: Number(e.target.value)})} />
                 </div>

                 <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                    {form.type === 'EducationFund' ? 'Tạo quỹ tích lũy' : 'Thêm vào danh mục'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* SECURITY CENTER MODAL (No changes here) */}
      {isSecurityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in border border-white/20">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-xl font-extrabold flex items-center gap-2"><ShieldCheck className="text-indigo-600" /> Trung tâm bảo mật</h3>
              <button onClick={() => setIsSecurityModalOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="space-y-6">
              {/* LIÊN KẾT EMAIL */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-xl ${currentEmail ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}><Mail size={22} /></div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold">Email nhận mã OTP</h4>
                        <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{currentEmail || 'Chưa liên kết'}</p>
                    </div>
                 </div>
                 <div className="space-y-3">
                    <div className="flex gap-2">
                       <input title="Link Email" className="flex-1 p-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Địa chỉ Gmail của bạn" value={linkEmailInput} onChange={e => setLinkEmailInput(e.target.value)} />
                       <button onClick={handleSendLinkOtp} disabled={isLinkingEmail} className="bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100">
                         {isLinkingEmail ? <RefreshCw className="animate-spin w-5 h-5"/> : <Send size={20} />}
                       </button>
                    </div>
                    {isWaitingOtp && (
                        <div className="space-y-3 animate-in slide-in-from-top-2">
                           <input title="Link OTP" className="w-full p-3 text-center text-lg border border-slate-200 rounded-xl tracking-[0.5em] font-black focus:ring-2 focus:ring-emerald-500" placeholder="000000" value={linkOtpInput} onChange={e => setLinkOtpInput(e.target.value)} maxLength={6} />
                           <button onClick={handleVerifyLinkOtp} className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold shadow-xl shadow-emerald-100 hover:bg-emerald-700">Xác thực & Lưu</button>
                        </div>
                    )}
                 </div>
              </div>
              
              {/* SMTP Config */}
              <div className={`p-5 rounded-2xl border transition-all shadow-sm ${showSmtpConfig ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                 <button onClick={() => setShowSmtpConfig(!showSmtpConfig)} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${hasSmtp ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}><Server size={22} /></div>
                        <div className="text-left">
                            <h4 className="text-sm font-bold">Cấu hình Email gửi</h4>
                            <p className="text-[10px] text-slate-500 font-medium">{hasSmtp ? 'Đã cấu hình' : 'Dùng Gmail để gửi mã xác thực'}</p>
                        </div>
                    </div>
                    <Settings size={18} className={`text-slate-400 transition-transform ${showSmtpConfig ? 'rotate-90' : ''}`} />
                 </button>
                 
                 {showSmtpConfig && (
                     <div className="mt-5 space-y-4 animate-in slide-in-from-top-4">
                        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 text-indigo-700 border-b pb-2 mb-2 text-xs font-bold">Hướng dẫn:</div>
                            <p className="text-[11px] text-slate-600">Bật <b>Xác minh 2 bước</b> trong Tài khoản Google {'>'} Tạo <b>Mật khẩu ứng dụng</b>.</p>
                            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 text-white text-[11px] font-bold rounded-lg"><ExternalLink size={12} /> Link trang mật khẩu ứng dụng</a>
                        </div>
                        <input title="SMTP Email" className="w-full p-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Gmail của bạn" value={smtpEmail} onChange={e => setSmtpEmail(e.target.value)} />
                        <input type="password" title="SMTP Pass" className="w-full p-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Mật khẩu ứng dụng (16 ký tự)" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} />
                        <button onClick={handleSaveSmtp} className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700">Lưu cấu hình</button>
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
