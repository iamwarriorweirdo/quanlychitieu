
import { Transaction, User, Goal, Budget, Investment, InvestmentSecurity } from '../types';

// Determine API base URL based on deployment path
const BASE_URL = (import.meta as any).env?.BASE_URL || '/';
const CLEAN_BASE_URL = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
const API_URL = `${CLEAN_BASE_URL}/api`;

const CURRENT_USER_KEY = 'fintrack_current_user';

// Helper để xử lý response
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMsg = `HTTP Error: ${response.status}`;
    try {
      const text = await response.text();
      try {
        const errorData = JSON.parse(text);
        if (errorData && errorData.error) {
          errorMsg = errorData.error;
        } else {
          console.warn("API Error JSON missing 'error' field:", errorData);
        }
      } catch {
        if (text) {
           if (text.trim().startsWith('<')) {
             errorMsg = `Server Error (${response.status}). See console for details.`;
             console.error("Server HTML Error:", text);
           } else {
             errorMsg = text.slice(0, 150) + (text.length > 150 ? '...' : '');
           }
        }
      }
    } catch (e) {
      console.error("Error reading response text:", e);
    }
    throw new Error(errorMsg);
  }
  return response.json();
};

export const initDB = async () => {
  try {
    await fetch(`${API_URL}/init`, { method: 'POST' });
    console.log("Database check/init requested to:", `${API_URL}/init`);
  } catch (error) {
    console.error("Failed to connect to backend.", error);
  }
};

// Transactions
export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  try {
    const response = await fetch(`${API_URL}/transactions?userId=${userId}`);
    return await handleResponse(response);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
};

export const saveTransaction = async (userId: string, transaction: Transaction): Promise<Transaction[]> => {
  try {
    await fetch(`${API_URL}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, transaction })
    }).then(handleResponse);

    return await getTransactions(userId);
  } catch (error) {
    console.error("Error saving transaction:", error);
    throw error;
  }
};

export const deleteTransaction = async (userId: string, transactionId: string): Promise<Transaction[]> => {
  try {
    await fetch(`${API_URL}/transactions?id=${transactionId}&userId=${userId}`, {
      method: 'DELETE',
    }).then(handleResponse);

    return await getTransactions(userId);
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }
};

// Goals
export const getGoals = async (userId: string): Promise<Goal[]> => {
  try {
    const response = await fetch(`${API_URL}/goals?userId=${userId}`);
    return await handleResponse(response);
  } catch (error) {
    console.error("Error fetching goals:", error);
    return [];
  }
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

// Budgets
export const getBudgets = async (userId: string): Promise<Budget[]> => {
  try {
    const response = await fetch(`${API_URL}/budgets?userId=${userId}`);
    return await handleResponse(response);
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return [];
  }
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

// Investments
export const getInvestments = async (userId: string): Promise<Investment[]> => {
  try {
    const response = await fetch(`${API_URL}/investments?userId=${userId}`);
    return await handleResponse(response);
  } catch (error) {
    console.error("Error fetching investments:", error);
    return [];
  }
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
    } catch (e) {
        console.error("Market fetch failed", e);
        throw e;
    }
};

// Security Services
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
    await fetch(`${API_URL}/security`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'setup', userId, password, email })
    }).then(handleResponse);
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

// Returns an object containing { success: boolean, demoOtpCode?: string, message?: string }
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

// User Auth
export const registerUser = async (username: string, password: string, email?: string, phone?: string): Promise<User> => {
  const newUser = {
    id: crypto.randomUUID(),
    username,
    password,
    email,
    phone
  };

  try {
    const registeredUser = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    }).then(handleResponse);
    return registeredUser as User;
  } catch (error) {
    console.error("Registration failed:", error);
    throw error;
  }
};

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  try {
    const user = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }).then(handleResponse);
    
    return user as User;
  } catch (error: any) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const loginWithGoogle = async (credential: string): Promise<User> => {
  try {
    const response = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });
    return await handleResponse(response);
  } catch (error) {
    console.error("Google Login failed:", error);
    throw error;
  }
};

export const getCurrentSession = (): User | null => {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  return data ? JSON.parse(data) : null;
};

export const setCurrentSession = (user: User | null) => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};