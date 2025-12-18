
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { translations, Language } from '../utils/i18n';
import { Users, Database, Shield, Trash2, Settings, Loader2, Power, AlertTriangle, ShieldCheck } from 'lucide-react';

interface Props {
  user: User;
  lang: Language;
}

export const AdminPanel: React.FC<Props> = ({ user, lang }) => {
  const t = translations[lang];
  const [data, setData] = useState<{ users: User[], stats: any, settings: any } | null>(null);
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
      await fetch(`/api/admin?adminId=${user.id}&targetUserId=${targetId}`, { method: 'DELETE' });
      fetchAdminData();
    } catch (err) { alert("Delete failed"); }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>;
  if (error) return <div className="p-20 text-center text-rose-500 font-bold">{error}</div>;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-3">
        <Shield className="text-indigo-600 w-8 h-8" />
        <h2 className="text-3xl font-bold text-slate-800">{t.admin.title}</h2>
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
                    <th className="p-4">Username</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{u.username}</div>
                        <div className="text-xs text-slate-400">{u.email || u.phone || 'No contact'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        {u.role !== 'admin' && (
                          <button 
                            onClick={() => deleteUser(u.id)}
                            className="text-rose-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
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
                       <div className="font-bold text-slate-800">{t.admin.aiToggle}</div>
                       <div className="text-xs text-slate-500">Gemini 3 Flash Pro</div>
                     </div>
                   </div>
                   <button 
                    onClick={() => toggleSetting('ai_enabled', data?.settings.ai_enabled)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${data?.settings.ai_enabled === 'true' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                   >
                     <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${data?.settings.ai_enabled === 'true' ? 'right-1' : 'left-1'}`}></div>
                   </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                   <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-lg ${data?.settings.maintenance_mode === 'true' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-400'}`}>
                       <AlertTriangle size={20} />
                     </div>
                     <div>
                       <div className="font-bold text-slate-800">{t.admin.maintenance}</div>
                       <div className="text-xs text-slate-500">Block all user access</div>
                     </div>
                   </div>
                   <button 
                    onClick={() => toggleSetting('maintenance_mode', data?.settings.maintenance_mode)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${data?.settings.maintenance_mode === 'true' ? 'bg-amber-500' : 'bg-slate-300'}`}
                   >
                     <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${data?.settings.maintenance_mode === 'true' ? 'right-1' : 'left-1'}`}></div>
                   </button>
                </div>
              </div>
           </div>

           <div className="bg-indigo-600 text-white p-6 rounded-2xl shadow-lg shadow-indigo-100">
              <h4 className="font-bold mb-2">Thông tin hệ thống</h4>
              <ul className="text-sm space-y-1 text-indigo-100">
                <li>DB: Neon PostgreSQL (Serverless)</li>
                <li>AI Engine: Google Gemini 3.0</li>
                <li>Frontend: React 19 + Tailwind</li>
                <li>Deployment: Vercel Edge Runtime</li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
};
