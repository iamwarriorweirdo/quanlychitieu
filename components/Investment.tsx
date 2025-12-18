
import React, { useState, useEffect } from 'react';
import { User, Investment, InvestmentSecurity } from '../types';
import { translations, Language } from '../utils/i18n';
import { Lock, Unlock, ShieldCheck, Plus, TrendingUp, TrendingDown, DollarSign, Activity, Trash2, RefreshCw, Settings, X, Calculator, Mail, CheckCircle2, Send, Server, AlertCircle, HelpCircle, CloudLightning, ExternalLink, Key, ShieldAlert } from 'lucide-react';
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

  const handleSaveSmtp = async () => {
      const cleanPass = smtpPass.trim().replace(/\s/g, '');
      if(!smtpEmail || !cleanPass) return alert("Vui lòng nhập đầy đủ Email và Mật khẩu ứng dụng.");
      if(cleanPass.length !== 16) return alert("Lỗi: Mật khẩu ứng dụng Google phải có đúng 16 ký tự viết liền. Bạn đang nhập " + cleanPass.length + " ký tự.");

      try {
        const res = await fetch(`${API_URL}/security`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'setup_smtp', userId: user.id, smtpEmail, smtpPassword: cleanPass })
        });
        if(!res.ok) throw new Error("Failed to save");
        alert("Cấu hình thành công! Hãy thử gửi lại OTP.");
        setShowSmtpConfig(false);
        checkStatus();
      } catch(e) {
        alert("Lưu thất bại.");
      }
  };

  const handleSendLinkOtp = async () => {
      if (!linkEmailInput) return;
      setIsLinkingEmail(true);
      setError('');
      try {
         await requestOtp(user.id, linkEmailInput);
         setIsWaitingOtp(true);
         alert(t.investment.otpSent);
      } catch (err: any) {
         setError(err.message);
         alert(err.message);
         if (err.message && (err.message.includes("cấu hình") || err.message.includes("xác thực"))) {
             setIsSecurityModalOpen(true);
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
          alert("Liên kết thành công!");
          checkStatus();
      } else {
          alert("Mã OTP không chính xác.");
      }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword) return alert("Vui lòng nhập mật khẩu mới.");
    try {
      await setupSecurity(user.id, newPassword);
      alert("Đổi mật khẩu cấp 2 thành công!");
      setNewPassword('');
    } catch (e) {
      alert("Đổi mật khẩu thất bại.");
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
    if (confirm("Xóa tài sản này khỏi danh mục?")) {
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
               <input type="password" title="Password Input" className="w-full p-3 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" placeholder={hasSetup ? t.investment.enterPass : t.investment.setupPass} value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
             )}
             {hasSetup && otpSent && (
               <div className="animate-in fade-in slide-in-from-bottom-2">
                 <p className="text-sm text-slate-500 mb-2">Nhập mã xác thực đã gửi đến: <br/><span className="font-bold text-slate-700">{currentEmail}</span></p>
                 <input title="OTP Input" className="w-full p-3 border rounded-lg bg-slate-50 text-center tracking-widest text-lg outline-none focus:ring-2 focus:ring-emerald-500" placeholder="000000" value={otpInput} onChange={e => setOtpInput(e.target.value)} maxLength={6} />
               </div>
             )}
             <button onClick={hasSetup ? handleUnlock : handleInitialSetup} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
               {hasSetup ? <Unlock size={18} /> : <ShieldCheck size={18} />}
               {hasSetup ? (otpSent ? t.investment.verify : t.investment.unlock) : t.investment.setup}
             </button>
             
             {hasSetup && otpSent && (
                <button onClick={() => { setOtpSent(false); setError(''); }} className="text-xs text-slate-400 hover:underline">Quay lại nhập mật khẩu</button>
             )}
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
               <div><span className="text-xs text-slate-400">Vốn đầu tư</span><p className="font-semibold">{totalCost.toLocaleString('vi-VN')}</p></div>
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
              {investments.length === 0 && (
                <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 italic">Chưa có tài sản trong danh mục.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isSecurityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in border border-white/20">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="text-xl font-extrabold flex items-center gap-2"><ShieldCheck className="text-indigo-600" /> Trung tâm bảo mật</h3>
              <button onClick={() => setIsSecurityModalOpen(false)} className="bg-slate-100 p-2 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
            </div>
            
            <div className="space-y-6">
              {/* PHẦN 1: LIÊN KẾT EMAIL NHẬN OTP */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
                 <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-xl ${currentEmail ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}><Mail size={22} /></div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold">Email nhận mã OTP</h4>
                        <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{currentEmail || 'Chưa liên kết'}</p>
                    </div>
                    {currentEmail && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-bold">Đã kích hoạt</span>}
                 </div>
                 
                 <div className="space-y-3">
                    {!isWaitingOtp ? (
                        <div className="flex gap-2">
                           <input title="Link Email" className="flex-1 p-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Địa chỉ Gmail của bạn" value={linkEmailInput} onChange={e => setLinkEmailInput(e.target.value)} />
                           <button onClick={handleSendLinkOtp} disabled={isLinkingEmail} className="bg-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 transition-all shadow-lg shadow-indigo-100">
                             {isLinkingEmail ? <RefreshCw className="animate-spin w-5 h-5"/> : <Send size={20} />}
                           </button>
                        </div>
                    ) : (
                        <div className="space-y-3 animate-in slide-in-from-top-2">
                           <div className="bg-indigo-50 p-3 rounded-xl text-xs text-indigo-700 text-center font-bold border border-indigo-100">Đã gửi mã đến {linkEmailInput}</div>
                           <input title="Link OTP" className="w-full p-3 text-center text-lg border border-slate-200 rounded-xl tracking-[0.5em] font-black focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="000000" value={linkOtpInput} onChange={e => setLinkOtpInput(e.target.value)} maxLength={6} />
                           <button onClick={handleVerifyLinkOtp} className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all">Xác thực ngay</button>
                           <button onClick={() => setIsWaitingOtp(false)} className="w-full text-xs text-slate-400 font-medium hover:text-slate-600">Dùng email khác</button>
                        </div>
                    )}
                 </div>
              </div>
              
              {/* PHẦN 2: CẤU HÌNH EMAIL GỬI (GUIDE CHI TIẾT) */}
              <div className={`p-5 rounded-2xl border transition-all shadow-sm ${showSmtpConfig ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                 <button onClick={() => setShowSmtpConfig(!showSmtpConfig)} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${hasSmtp ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}><Server size={22} /></div>
                        <div className="text-left">
                            <h4 className="text-sm font-bold">Email Gửi OTP (Bắt buộc)</h4>
                            <p className="text-[10px] text-slate-500 font-medium">{hasSmtp ? 'Hệ thống đang dùng tài khoản của bạn' : 'Cần cài đặt để gửi mail ổn định'}</p>
                        </div>
                    </div>
                    <Settings size={18} className={`text-slate-400 transition-transform duration-300 ${showSmtpConfig ? 'rotate-90' : ''}`} />
                 </button>
                 
                 {showSmtpConfig && (
                     <div className="mt-5 space-y-4 animate-in slide-in-from-top-4 duration-500">
                        {/* Hướng dẫn Step-by-Step */}
                        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm space-y-3">
                            <div className="flex items-center gap-2 text-indigo-700 border-b pb-2 mb-2">
                                <HelpCircle size={16} />
                                <span className="text-xs font-black uppercase">Hướng dẫn 3 bước của Google</span>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                                    <p className="text-[11px] text-slate-600">Truy cập <b>Tài khoản Google</b> {'>'} <b>Bảo mật</b> và bật <b>Xác minh 2 bước</b>.</p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                                    <p className="text-[11px] text-slate-600">Tìm từ khóa <b>"Mật khẩu ứng dụng"</b> trong ô tìm kiếm của Google.</p>
                                </div>
                                <div className="flex gap-3">
                                    <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                                    <p className="text-[11px] text-slate-600">Đặt tên (VD: Finance App) và nhấn <b>Tạo</b>. Copy mã <b>16 ký tự</b> và dán vào ô bên dưới.</p>
                                </div>
                            </div>

                            <div className="pt-2">
                                <a 
                                    href="https://myaccount.google.com/apppasswords" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 text-white text-[11px] font-bold rounded-lg hover:bg-black transition-all"
                                >
                                    <ExternalLink size={12} /> Đi tới trang Mật khẩu ứng dụng Google
                                </a>
                            </div>
                        </div>

                        <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 flex items-start gap-2">
                            <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-rose-800 leading-relaxed">
                                <b>Lưu ý cực kỳ quan trọng:</b> KHÔNG nhập mật khẩu đăng nhập Gmail. Google sẽ chặn ngay lập tức. Phải dùng mật khẩu 16 ký tự vừa tạo ở bước 3.
                            </p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Gmail của bạn</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input title="SMTP Email" className="w-full pl-10 p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white" placeholder="vi-du@gmail.com" value={smtpEmail} onChange={e => setSmtpEmail(e.target.value)} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Mật khẩu ứng dụng (16 ký tự)</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type="password" title="SMTP Pass" className="w-full pl-10 p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white" placeholder="xxxx xxxx xxxx xxxx" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSaveSmtp} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl text-sm font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all">Lưu & Thử lại OTP</button>
                     </div>
                 )}
              </div>

              {/* PHẦN 3: ĐỔI MẬT KHẨU CẤP 2 */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2"><Lock size={18} className="text-slate-400" /> Đổi mật khẩu mở khóa (Cấp 2)</h4>
                  <div className="flex gap-2">
                      <input type="password" title="New Password" className="flex-1 p-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Mật khẩu mới" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                      <button onClick={handleUpdatePassword} className="bg-slate-800 text-white px-6 py-3 rounded-xl text-xs font-bold hover:bg-black transition-colors">Lưu mới</button>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
