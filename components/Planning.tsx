
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
    // Check if budget already exists for this category, update it or create new ID
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
    <div className="space-y-8 pb-24 md:pb-0">
      
      {/* SECTION 1: GOALS */}
      <div>
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
             <Target className="text-indigo-600 dark:text-indigo-400" /> {t.planning.goals}
           </h2>
           <button 
             onClick={() => setGoalModalOpen(true)}
             className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-1"
           >
             <Plus size={16} /> {t.planning.addGoal}
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => {
            const percent = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            const days = calculateDaysLeft(goal.deadline);
            return (
              <div key={goal.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
                 <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                      {getIcon(goal.icon)}
                    </div>
                    <button onClick={() => onDeleteGoal(goal.id)} className="text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400"><Trash2 size={16}/></button>
                 </div>
                 <h3 className="font-bold text-slate-800 dark:text-white">{goal.name}</h3>
                 <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                    <span>{t.planning.current}: {formatCurrency(goal.currentAmount)}</span>
                    <span>{t.planning.target}: {formatCurrency(goal.targetAmount)}</span>
                 </div>
                 <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percent}%` }}></div>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${days < 0 ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                      {days < 0 ? t.planning.expired : `${days} ${t.planning.daysLeft}`}
                    </span>
                    <button 
                      onClick={() => {
                        const add = prompt(t.planning.deposit);
                        if (add && !isNaN(Number(add))) {
                          onUpdateGoal({ ...goal, currentAmount: goal.currentAmount + Number(add) });
                        }
                      }}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      + {t.planning.deposit}
                    </button>
                 </div>
              </div>
            );
          })}
          
          {goals.length === 0 && (
            <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-600">
               <PiggyBank className="mx-auto w-10 h-10 mb-2 opacity-50"/>
               <p>{t.planning.goals}</p>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: BUDGETS */}
      <div>
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
             <TrendingUp className="text-indigo-600 dark:text-indigo-400" /> {t.planning.budgets}
           </h2>
           <button 
             onClick={() => setBudgetModalOpen(true)}
             className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
           >
             <Plus size={16} /> {t.planning.addBudget}
           </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
           {budgets.length > 0 ? (
             <div className="divide-y divide-slate-100 dark:divide-slate-800">
               {budgets.map(budget => {
                 const actual = calculateActualSpent(budget.category);
                 const percent = Math.min(100, (actual / budget.amount) * 100);
                 const isOver = actual > budget.amount;
                 const transCategory = translations[lang].categories[budget.category as keyof typeof translations['en']['categories']] || budget.category;

                 return (
                   <div key={budget.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="flex justify-between items-center mb-2">
                         <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-700 dark:text-white">{transCategory}</span>
                            {isOver && <AlertCircle size={14} className="text-rose-500" />}
                         </div>
                         <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                              {formatCurrency(actual)} / <span className="text-slate-400 dark:text-slate-600">{formatCurrency(budget.amount)}</span>
                            </span>
                            <button onClick={() => onDeleteBudget(budget.id)} className="text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400"><Trash2 size={14}/></button>
                         </div>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                         <div 
                           className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                           style={{ width: `${percent}%` }}
                         ></div>
                      </div>
                      <div className="mt-1 flex justify-end">
                        <span className={`text-[10px] font-bold ${isOver ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>
                           {percent.toFixed(0)}%
                        </span>
                      </div>
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className="p-8 text-center text-slate-400 text-sm">
                {t.planning.noBudgets}
             </div>
           )}
        </div>
      </div>

      {/* MODAL: ADD GOAL */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200 border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4 dark:text-white">{t.planning.modalGoalTitle}</h3>
            <div className="space-y-3">
               <input 
                 className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white"
                 placeholder={t.planning.goalName}
                 value={goalForm.name}
                 onChange={e => setGoalForm({...goalForm, name: e.target.value})}
               />
               <input 
                 type="number"
                 className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white"
                 placeholder={t.planning.target}
                 value={goalForm.targetAmount || ''}
                 onChange={e => setGoalForm({...goalForm, targetAmount: Number(e.target.value)})}
               />
               <input 
                 type="date"
                 className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white"
                 value={goalForm.deadline}
                 onChange={e => setGoalForm({...goalForm, deadline: e.target.value})}
               />
               <div className="flex gap-2 justify-center py-2">
                  {['plane', 'home', 'card', 'shopping', 'target'].map(ic => (
                    <button 
                      key={ic}
                      onClick={() => setGoalForm({...goalForm, icon: ic})}
                      className={`p-2 rounded-lg ${goalForm.icon === ic ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}
                    >
                      {getIcon(ic)}
                    </button>
                  ))}
               </div>
               <div className="flex gap-2 mt-4">
                 <button onClick={() => setGoalModalOpen(false)} className="flex-1 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">{t.manual.cancel}</button>
                 <button onClick={handleSaveGoal} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t.planning.addGoal}</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD BUDGET */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200 border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4 dark:text-white">{t.planning.modalBudgetTitle}</h3>
            <div className="space-y-3">
               <select
                 className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white"
                 value={budgetForm.category}
                 onChange={e => setBudgetForm({...budgetForm, category: e.target.value})}
               >
                 {Object.entries(translations[lang].categories).map(([k, v]) => (
                   <option key={k} value={k}>{v}</option>
                 ))}
               </select>
               <input 
                 type="number"
                 className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 dark:text-white"
                 placeholder={t.manual.amount}
                 value={budgetForm.amount || ''}
                 onChange={e => setBudgetForm({...budgetForm, amount: Number(e.target.value)})}
               />
               <div className="flex gap-2 mt-4">
                 <button onClick={() => setBudgetModalOpen(false)} className="flex-1 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg">{t.manual.cancel}</button>
                 <button onClick={handleSaveBudget} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">{t.planning.addBudget}</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
