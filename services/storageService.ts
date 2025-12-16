import { Transaction, User } from '../types';

// Determine API base URL based on deployment path
const BASE_URL = import.meta.env.BASE_URL || '/';
const CLEAN_BASE_URL = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
const API_URL = `${CLEAN_BASE_URL}/api`;

const CURRENT_USER_KEY = 'fintrack_current_user';

// Helper để xử lý response
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMsg = `HTTP Error: ${response.status}`;
    try {
      const text = await response.text();
      // Try parsing JSON error
      try {
        const errorData = JSON.parse(text);
        if (errorData && errorData.error) {
          errorMsg = errorData.error;
        } else {
          // If JSON but no 'error' field, fallback to status
          console.warn("API Error JSON missing 'error' field:", errorData);
        }
      } catch {
        // Not JSON, use raw text if available
        if (text) {
           // Clean up HTML tags if present (simple check)
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

    // Refresh list
    return await getTransactions(userId);
  } catch (error) {
    console.error("Error saving transaction:", error);
    throw error;
  }
};

export const deleteTransaction = async (userId: string, transactionId: string): Promise<Transaction[]> => {
  try {
    // Sử dụng query param id thay vì path param để đơn giản hóa routing trên Vercel functions
    await fetch(`${API_URL}/transactions?id=${transactionId}&userId=${userId}`, {
      method: 'DELETE',
    }).then(handleResponse);

    // Refresh list
    return await getTransactions(userId);
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }
};

// User Auth
export const registerUser = async (username: string, password: string): Promise<User> => {
  const newUser = {
    id: crypto.randomUUID(),
    username,
    password 
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