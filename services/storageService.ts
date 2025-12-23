
import { Transaction, User, Goal, Budget, Investment, InvestmentSecurity } from '../types';
import { Capacitor } from '@capacitor/core';

// CẤU HÌNH DOMAIN CHÍNH
const PRODUCTION_DOMAIN = 'https://quanlychitieu-dusky.vercel.app';

// Logic: Nếu là App (Native) -> Gọi full URL. Nếu là Web -> Gọi path relative (/api) để tránh CORS.
const API_URL = Capacitor.isNativePlatform() 
  ? `${PRODUCTION_DOMAIN}/api` 
  : '/api';

const CURRENT_USER_KEY = 'fintrack_current_user';
const LOCAL_TX_CACHE = 'fintrack_tx_cache_';
const OFFLINE_QUEUE = 'fintrack_offline_queue_';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMsg = `HTTP Error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.error) errorMsg = errorData.error;
    } catch {}
    throw new Error(errorMsg);
  }
  return response.json();
};

const getLocalData = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setLocalData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const initDB = async () => {
  if (!navigator.onLine) return;
  try {
    await fetch(`${API_URL}/init`, { method: 'POST' });
  } catch (error) {
    console.warn("Backend connection failed.");
  }
};

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  const cacheKey = LOCAL_TX_CACHE + userId;
  if (navigator.onLine) {
    try {
      const response = await fetch(`${API_URL}/transactions?userId=${userId}`);
      const data = await handleResponse(response);
      setLocalData(cacheKey, data); 
      return data;
    } catch (error) {
      console.error("Fetch failed, using local cache:", error);
    }
  }
  return getLocalData<Transaction>(cacheKey);
};

export const saveTransaction = async (userId: string, transaction: Transaction): Promise<Transaction[]> => {
  const cacheKey = LOCAL_TX_CACHE + userId;
  const queueKey = OFFLINE_QUEUE + userId;
  
  const currentLocal = getLocalData<Transaction>(cacheKey);
  const exists = currentLocal.findIndex(t => t.id === transaction.id);
  let updatedLocal;
  if (exists > -1) {
    updatedLocal = [...currentLocal];
    updatedLocal[exists] = transaction;
  } else {
    updatedLocal = [transaction, ...currentLocal];
  }
  setLocalData(cacheKey, updatedLocal);

  if (navigator.onLine) {
    try {
      await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, transaction })
      }).then(handleResponse);
      return await getTransactions(userId);
    } catch (e) {
      const queue = getLocalData<Transaction>(queueKey);
      setLocalData(queueKey, [...queue, transaction]);
    }
  } else {
    const queue = getLocalData<Transaction>(queueKey);
    setLocalData(queueKey, [...queue, transaction]);
  }
  return updatedLocal;
};

export const deleteTransaction = async (userId: string, transactionId: string): Promise<Transaction[]> => {
  const cacheKey = LOCAL_TX_CACHE + userId;
  const currentLocal = getLocalData<Transaction>(cacheKey);
  const updatedLocal = currentLocal.filter(t => t.id !== transactionId);
  setLocalData(cacheKey, updatedLocal);
  if (navigator.onLine) {
    try {
      await fetch(`${API_URL}/transactions?id=${transactionId}&userId=${userId}`, { method: 'DELETE' }).then(handleResponse);
      return await getTransactions(userId);
    } catch (e) {}
  }
  return updatedLocal;
};

export const syncOfflineData = async (userId: string) => {
  if (!navigator.onLine) return;
  const queueKey = OFFLINE_QUEUE + userId;
  const queue = getLocalData<Transaction>(queueKey);
  if (queue.length === 0) return;
  for (const tx of queue) {
    try {
      await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, transaction: tx })
      });
    } catch (e) { break; }
  }
  setLocalData(queueKey, []);
};

export const getGoals = async (userId: string): Promise<Goal[]> => {
  try {
    const response = await fetch(`${API_URL}/goals?userId=${userId}`);
    return await handleResponse(response);
  } catch (error) { return []; }
};

export const saveGoal = async (userId: string, goal: Goal): Promise<Goal[]> => {
  try {
    await fetch(`${API_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal })
    }).then(handleResponse);
    return await getGoals(userId);
  } catch (error) { throw error; }
};

export const deleteGoal = async (userId: string, goalId: string): Promise<Goal[]> => {
  try {
    await fetch(`${API_URL}/goals?id=${goalId}&userId=${userId}`, { method: 'DELETE' }).then(handleResponse);
    return await getGoals(userId);
  } catch (error) { throw error; }
};

export const getBudgets = async (userId: string): Promise<Budget[]> => {
  try {
    const response = await fetch(`${API_URL}/budgets?userId=${userId}`);
    return await handleResponse(response);
  } catch (error) { return []; }
};

export const saveBudget = async (userId: string, budget: Budget): Promise<Budget[]> => {
  try {
    await fetch(`${API_URL}/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget })
    }).then(handleResponse);
    return await getBudgets(userId);
  } catch (error) { throw error; }
};

export const deleteBudget = async (userId: string, budgetId: string): Promise<Budget[]> => {
  try {
    await fetch(`${API_URL}/budgets?id=${budgetId}&userId=${userId}`, { method: 'DELETE' }).then(handleResponse);
    return await getBudgets(userId);
  } catch (error) { throw error; }
};

export const getInvestments = async (userId: string): Promise<Investment[]> => {
  try {
    const response = await fetch(`${API_URL}/investments?userId=${userId}`);
    return await handleResponse(response);
  } catch (error) { return []; }
};

export const saveInvestment = async (userId: string, investment: Investment): Promise<Investment[]> => {
  try {
    await fetch(`${API_URL}/investments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ investment })
    }).then(handleResponse);
    return await getInvestments(userId);
  } catch (error) { throw error; }
};

export const deleteInvestment = async (userId: string, investmentId: string): Promise<Investment[]> => {
  try {
    await fetch(`${API_URL}/investments?id=${investmentId}&userId=${userId}`, { method: 'DELETE' }).then(handleResponse);
    return await getInvestments(userId);
  } catch (error) { throw error; }
};

export const fetchMarketPrices = async (symbols: string[]): Promise<Record<string, number>> => {
    try {
        const response = await fetch(`${API_URL}/market`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ symbols })
        });
        const data = await handleResponse(response);
        return data.prices;
    } catch (e) { throw e; }
};

export const checkSecurityStatus = async (userId: string): Promise<InvestmentSecurity> => {
    try {
        const response = await fetch(`${API_URL}/security`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'check_status', userId })
        });
        return await handleResponse(response);
    } catch (e) { return { userId, hasPassword: false, isOtpEnabled: false }; }
};

export const setupSecurity = async (userId: string, password: string, email?: string): Promise<void> => {
  try {
    await fetch(`${API_URL}/security`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'setup', userId, password, email })
    }).then(handleResponse);
  } catch (e: any) { throw e; }
};

export const verifySecondaryPassword = async (userId: string, password: string): Promise<boolean> => {
    try {
        await fetch(`${API_URL}/security`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'verify_password', userId, password })
        }).then(handleResponse);
        return true;
    } catch { return false; }
};

export const requestOtp = async (userId: string, targetEmail?: string): Promise<any> => {
    const res = await fetch(`${API_URL}/security`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'request_otp', userId, targetEmail })
    }).then(handleResponse);
    return res;
};

export const verifyOtp = async (userId: string, otp: string): Promise<boolean> => {
    try {
        await fetch(`${API_URL}/security`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'verify_otp', userId, otp })
        }).then(handleResponse);
        return true;
    } catch { return false; }
};

export const registerUser = async (username: string, password: string, email?: string, phone?: string): Promise<User> => {
  const newUser = { id: crypto.randomUUID(), username, password, email, phone };
  try {
    const registeredUser = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    }).then(handleResponse);
    return registeredUser as User;
  } catch (error) { throw error; }
};

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  try {
    const user = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }).then(handleResponse);
    return user as User;
  } catch (error: any) { throw error; }
};

export const loginWithGoogle = async (credential: string): Promise<User> => {
  try {
    const response = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });
    const user = await handleResponse(response);
    localStorage.removeItem(LOCAL_TX_CACHE + user.id);
    return user;
  } catch (error) { throw error; }
};

export const getCurrentSession = (): User | null => {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const setCurrentSession = (user: User | null) => {
  if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(CURRENT_USER_KEY);
};
