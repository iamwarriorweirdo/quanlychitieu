
import React, { useState } from 'react';
import { User, Transaction, Goal, Budget, Category, TransactionType } from '../types';
import { translations, Language } from '../utils/i18n';
import { Plus, Target, PiggyBank, Calendar, Trash2, TrendingUp, AlertCircle, Plane, ShoppingBag, Home, CreditCard } from 'lucide-react';

interface Props {
  user: User;
  transactions: Transaction[];
  goals: Goal[];
  budgets: Budget[];
  onAddGoal: (goal: Goal) => void;
  onDeleteGoal: (id: string) => void;
  onUpdateGoal: (goal: Goal) => void;
  onAddBudget: (budget: Budget) => void;
  onDeleteBudget: (id: string) => void;
  lang: Language;
  formatCurrency: (amount: number) => string;
}

export const Planning: React.FC<Props> = ({ 
  user, transactions, goals, budgets, 
  onAddGoal, onDeleteGoal, onUpdateGoal, onAddBudget, onDeleteBudget, lang, formatCurrency 
}) => {
  const t = translations[lang];
  const [isGoalModalOpen, setGoalModalOpen] = useState(false);
  const [isBudgetModalOpen, setBudgetModalOpen] = useState(false);

  // Form States
  const [goalForm, setGoalForm] = useState<Partial<Goal>>({ name: '', targetAmount: 0, currentAmount: 0, deadline: '', icon: 'target' });
  const [budgetForm, setBudgetForm] = useState<Partial<Budget>>({ category: Category.FOOD, amount: 0 });

  // Helpers
  const calculateDaysLeft = (deadline: string) => {
    const diff = new Date(deadline).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const calculateActualSpent = (category: string) => {
    const now = new Date();
    return transactions
      .filter(tx => 
        tx.type === TransactionType.EXPENSE && 
        tx.category === category && 
        new Date(tx.date).getMonth() === now.getMonth() &&
        new Date(tx.date).getFullYear() === now.getFullYear()
      )
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  const handleSaveGoal = () => {
    if (!goalForm.name || !goalForm.targetAmount) return;
    onAddGoal({
      id: crypto.randomUUID(),
      userId: user.id,
      name: goalForm.name,
      targetAmount: Number(goalForm.targetAmount),
      currentAmount: Number(goalForm.currentAmount) || 0,
      deadline: goalForm.deadline || new Date().toISOString(),
      icon: goalForm.icon || 'target'
    });
    setGoalModalOpen(false);
    setGoalForm({ name: '', targetAmount: 0, currentAmount: 0, deadline: '', icon: 'target' });
  };

  const handleSaveBudget = () => {
    if (!budgetForm.amount) return;
    const existing = budgets.find(b => b.category === budgetForm.category);
    onAddBudget({
      id: existing ? existing.id : crypto.randomUUID(),
      userId: user.id,
      category: budgetForm.category!,
      amount: Number(budgetForm.amount),
      period: 'monthly'
    });
    setBudgetModalOpen(false);
    setBudgetForm({ category: Category.FOOD, amount: 0 });
  };

  const getIcon = (iconName: string) => {
    switch(iconName) {
      case 'plane': return <Plane size={24} />;
      case 'home': return <Home size={24} />;
      case 'card': return <CreditCard size={24} />;
      case 'shopping': return <ShoppingBag size={24} />;
      default: return <Target size={24} />;
    }
  };

  return (
    <div className="space-y-8 pb-24 md:pb-0 px-1">
      
      {/* SECTION 1: GOALS */}
      <div>
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
             <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Target size={20} /></div>
             {t.planning.goals}
           </h2>
           <button 
             onClick={() => setGoalModalOpen(true)}
             className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 shadow-md shadow-indigo-100 active:scale-95 transition-all"
           >
             <Plus size={16} /> {t.planning.addGoal}
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => {
            const percent = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            const days = calculateDaysLeft(goal.deadline);
            return (
              <div key={goal.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-all">
                 <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      {getIcon(goal.icon)}
                    </div>
                    <button onClick={() => onDeleteGoal(goal.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                 </div>
                 <h3 className="font-bold text-slate-800 text-sm">{goal.name}</h3>
                 <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1 mb-3">
                    <span>{t.planning.current}: {formatCurrency(goal.currentAmount)}</span>
                    <span>{t.planning.target}: {formatCurrency(goal.targetAmount)}</span>
                 </div>
                 <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden mb-3 border border-slate-100">
                    <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${days < 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                      {days < 0 ? t.planning.expired : `${days} ${t.planning.daysLeft}`}
                    </span>
                    <button 
                      onClick={() => {
                        const add = prompt(t.planning.deposit);
                        if (add && !isNaN(Number(add))) {
                          onUpdateGoal({ ...goal, currentAmount: goal.currentAmount + Number(add) });
                        }
                      }}
                      className="text-xs font-black text-indigo-600 hover:underline px-2 py-1 bg-indigo-50 rounded-lg"
                    >
                      + {t.planning.deposit}
                    </button>
                 </div>
              </div>
            );
          })}
          
          {goals.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 bg-white rounded-3xl">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                  <PiggyBank size={32}/>
               </div>
               <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">{t.planning.goals}</p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: BUDGETS */}
      <div>
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
             <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><TrendingUp size={20} /></div>
             {t.planning.budgets}
           </h2>
           <button 
             onClick={() => setBudgetModalOpen(true)}
             className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-1 active:scale-95 transition-all shadow-sm"
           >
             <Plus size={16} /> {t.planning.addBudget}
           </button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
           {budgets.length > 0 ? (
             <div className="divide-y divide-slate-50">
               {budgets.map(budget => {
                 const actual = calculateActualSpent(budget.category);
                 const percent = Math.min(100, (actual / budget.amount) * 100);
                 const isOver = actual > budget.amount;
                 const transCategory = translations[lang].categories[budget.category as keyof typeof translations['en']['categories']] || budget.category;

                 return (
                   <div key={budget.id} className="p-5 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-center mb-2.5">
                         <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-800 text-sm">{transCategory}</span>
                            {isOver && <div className="animate-pulse bg-rose-100 text-rose-600 p-1 rounded-full"><AlertCircle size={14} /></div>}
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-xs font-black text-slate-700">
                                {formatCurrency(actual)}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-tighter">
                                / {formatCurrency(budget.amount)}
                              </span>
                            </div>
                            <button onClick={() => onDeleteBudget(budget.id)} className="p-2 text-slate-300 hover:text-rose-500 bg-slate-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                         </div>
                      </div>
                      <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                         <div 
                           className={`h-full rounded-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                           style={{ width: `${percent}%` }}
                         ></div>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className={`text-[10px] font-black uppercase ${isOver ? 'text-rose-500' : 'text-slate-400'}`}>
                           {isOver ? 'Vượt định mức' : 'Đang sử dụng'}
                        </span>
                        <span className={`text-[10px] font-black ${isOver ? 'text-rose-600' : 'text-slate-700'}`}>
                           {percent.toFixed(0)}%
                        </span>
                      </div>
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="p-12 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                   <Calendar size={32}/>
                </div>
                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">{t.planning.noBudgets}</p>
             </div>
           )}
        </div>
      </div>

      {/* MODAL: ADD GOAL */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-300 border border-slate-100">
            <h3 className="text-xl font-black text-slate-800 mb-6">{t.planning.modalGoalTitle}</h3>
            <div className="space-y-4">
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">{t.planning.goalName}</label>
                 <input 
                   className="w-full p-3.5 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-bold"
                   placeholder="VD: Mua iPhone 16 Pro Max"
                   value={goalForm.name}
                   onChange={e => setGoalForm({...goalForm, name: e.target.value})}
                 />
               </div>
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">{t.planning.target}</label>
                 <input 
                   type="number"
                   className="w-full p-3.5 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-bold"
                   placeholder="0"
                   value={goalForm.targetAmount || ''}
                   onChange={e => setGoalForm({...goalForm, targetAmount: Number(e.target.value)})}
                 />
               </div>
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Ngày dự kiến đạt được</label>
                 <input 
                   type="date"
                   className="w-full p-3.5 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-bold"
                   value={goalForm.deadline}
                   onChange={e => setGoalForm({...goalForm, deadline: e.target.value})}
                 />
               </div>
               <div className="flex gap-2 justify-center py-2 bg-slate-50 rounded-2xl">
                  {['plane', 'home', 'card', 'shopping', 'target'].map(ic => (
                    <button 
                      key={ic}
                      onClick={() => setGoalForm({...goalForm, icon: ic})}
                      className={`p-3 rounded-xl transition-all ${goalForm.icon === ic ? 'bg-white text-indigo-600 shadow-sm scale-110' : 'text-slate-400 hover:text-indigo-400'}`}
                    >
                      {getIcon(ic)}
                    </button>
                  ))}
               </div>
               <div className="flex gap-3 mt-6 pt-2">
                 <button onClick={() => setGoalModalOpen(false)} className="flex-1 py-4 text-slate-500 font-bold bg-slate-100 rounded-2xl active:scale-95 transition-all">{t.manual.cancel}</button>
                 <button onClick={handleSaveGoal} className="flex-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all">{t.planning.addGoal}</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD BUDGET */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in duration-300 border border-slate-100">
            <h3 className="text-xl font-black text-slate-800 mb-6">{t.planning.modalBudgetTitle}</h3>
            <div className="space-y-5">
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">{t.manual.category}</label>
                 <select
                   className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-bold appearance-none"
                   value={budgetForm.category}
                   onChange={e => setBudgetForm({...budgetForm, category: e.target.value})}
                 >
                   {Object.entries(translations[lang].categories).map(([k, v]) => (
                     <option key={k} value={k}>{v}</option>
                   ))}
                 </select>
               </div>
               <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Ngân sách dự kiến</label>
                 <input 
                   type="number"
                   className="w-full p-4 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-bold"
                   placeholder="0"
                   value={budgetForm.amount || ''}
                   onChange={e => setBudgetForm({...budgetForm, amount: Number(e.target.value)})}
                 />
               </div>
               <div className="flex gap-3 mt-6 pt-2">
                 <button onClick={() => setBudgetModalOpen(false)} className="flex-1 py-4 text-slate-500 font-bold bg-slate-100 rounded-2xl active:scale-95 transition-all">{t.manual.cancel}</button>
                 <button onClick={handleSaveBudget} className="flex-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all">{t.planning.addBudget}</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
