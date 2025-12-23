
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { translations, Language } from '../utils/i18n';
import { Users, Database, Shield, Trash2, Settings, Loader2, Power, AlertTriangle, ShieldCheck, UserCog, BadgeCheck, ShieldAlert } from 'lucide-react';

interface Props {
  user: User;
  lang: Language;
}

export const AdminPanel: React.FC<Props> = ({ user, lang }) => {
  const t = translations[lang];
  const [data, setData] = useState<{ users: User[], stats: any, settings: any, currentUserRole: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAdminData = async () => {
    try {
      const res = await fetch(`/api/admin?adminId=${user.id}`);
      if (!res.ok) throw new Error("Unauthorized or Error");
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user.id]);

  const toggleSetting = async (key: string, currentValue: string) => {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    try {
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, action: 'update_setting', key, value: newValue })
      });
      fetchAdminData();
    } catch (err) { alert("Failed to update"); }
  };

  const deleteUser = async (targetId: string) => {
    if (!confirm(t.admin.confirmDelete)) return;
    try {
      const res = await fetch(`/api/admin?adminId=${user.id}&targetUserId=${targetId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Delete failed");
      }
      fetchAdminData();
    } catch (err: any) { alert(err.message); }
  };

  const changeRole = async (targetId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const confirmMsg = newRole === 'admin' ? "Nâng cấp người dùng này lên Admin?" : "Gỡ quyền Admin của người dùng này?";
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, action: 'update_user_role', targetUserId: targetId, newRole })
      });
      if (!res.ok) throw new Error("Update role failed");
      fetchAdminData();
    } catch (err: any) { alert(err.message); }
  };

  const isSuperAdmin = data?.currentUserRole === 'superadmin';

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>;
  if (error) return <div className="p-20 text-center text-rose-500 font-bold">{error}</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSuperAdmin ? <ShieldAlert className="text-rose-600 w-8 h-8" /> : <Shield className="text-indigo-600 w-8 h-8" />}
          <div>
            <h2 className="text-3xl font-bold text-slate-800">{isSuperAdmin ? "Hệ thống SuperAdmin" : t.admin.title}</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isSuperAdmin ? "Toàn quyền quản trị" : "Quản trị hệ thống"}</p>
          </div>
        </div>
        {isSuperAdmin && (
            <div className="bg-rose-100 text-rose-700 px-4 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 border border-rose-200">
                <BadgeCheck size={14} /> SuperAdmin
            </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-3 text-slate-500 mb-2">
             <Users size={20} />
             <span className="text-sm font-medium">{t.admin.totalUsers}</span>
           </div>
           <p className="text-3xl font-bold text-slate-800">{data?.stats.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-3 text-slate-500 mb-2">
             <Database size={20} />
             <span className="text-sm font-medium">{t.admin.totalTx}</span>
           </div>
           <p className="text-3xl font-bold text-slate-800">{data?.stats.totalTransactions}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-3 text-slate-500 mb-2">
             <ShieldCheck size={20} />
             <span className="text-sm font-medium">{t.admin.totalInv}</span>
           </div>
           <p className="text-3xl font-bold text-slate-800">{data?.stats.totalInvestments}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
           <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
             <Users size={20} className="text-indigo-600" />
             <h3 className="font-bold text-slate-800">{t.admin.users}</h3>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="p-4">Người dùng</th>
                    <th className="p-4">Vai trò</th>
                    <th className="p-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm">{u.username}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{u.email || u.phone || 'No contact'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase border ${
                          u.role === 'superadmin' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                          u.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                          'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                            {isSuperAdmin && u.id !== user.id && u.role !== 'superadmin' && (
                                <button 
                                    onClick={() => changeRole(u.id, u.role || 'user')}
                                    className="p-2 text-indigo-400 hover:text-indigo-600 bg-slate-50 rounded-lg transition-colors"
                                    title="Thay đổi vai trò"
                                >
                                    <UserCog size={18} />
                                </button>
                            )}
                            {(isSuperAdmin || (u.role !== 'admin' && u.role !== 'superadmin')) && u.id !== user.id && (
                                <button 
                                    onClick={() => deleteUser(u.id)}
                                    className="p-2 text-rose-300 hover:text-rose-600 bg-slate-50 rounded-lg transition-colors"
                                    title="Xóa người dùng"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
        </div>

        {/* System Settings */}
        <div className="space-y-6">
           <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Settings size={20} className="text-indigo-600" />
                <h3 className="font-bold text-slate-800">{t.admin.sysHealth}</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                   <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-lg ${data?.settings.ai_enabled === 'true' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                       <Power size={20} />
                     </div>
                     <div>
                       <div className="font-bold text-slate-800 text-sm">{t.admin.aiToggle}</div>
                       <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Gemini 3 Flash</div>
                     </div>
                   </div>
                   <button 
                    onClick={() => toggleSetting('ai_enabled', data?.settings.ai_enabled)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${data?.settings.ai_enabled === 'true' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                   >
                     <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${data?.settings.ai_enabled === 'true' ? 'right-0.5' : 'left-0.5'}`}></div>
                   </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-transparent hover:border-amber-200 transition-colors">
                   <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-lg ${data?.settings.maintenance_mode === 'true' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                       <AlertTriangle size={20} />
                     </div>
                     <div>
                       <div className="font-bold text-slate-800 text-sm">{t.admin.maintenance}</div>
                       <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Chặn truy cập người dùng</div>
                     </div>
                   </div>
                   <button 
                    onClick={() => toggleSetting('maintenance_mode', data?.settings.maintenance_mode)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${data?.settings.maintenance_mode === 'true' ? 'bg-amber-500' : 'bg-slate-300'}`}
                   >
                     <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${data?.settings.maintenance_mode === 'true' ? 'right-0.5' : 'left-0.5'}`}></div>
                   </button>
                </div>
              </div>
           </div>

           <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg shadow-indigo-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 -mr-4 -mt-4"><Database size={80} /></div>
              <h4 className="font-black text-sm uppercase tracking-widest mb-3">Thông tin hạ tầng</h4>
              <ul className="text-xs space-y-2 text-indigo-100 font-medium">
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-white rounded-full"></div> DB: Neon PostgreSQL (Serverless)</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-white rounded-full"></div> AI Engine: Gemini 3.0 Flash</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-white rounded-full"></div> Framework: React 19 + Tailwind</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 bg-white rounded-full"></div> Runtime: Vercel Edge</li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
};
