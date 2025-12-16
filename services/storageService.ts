import { Transaction, User } from '../types';

// Sử dụng đường dẫn tương đối để Vercel tự điều hướng về API route cùng domain
const API_URL = '/api';

const CURRENT_USER_KEY = 'fintrack_current_user';

// Helper để xử lý response
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP Error: ${response.status}`);
  }
  return response.json();
};

export const initDB = async () => {
  try {
    await fetch(`${API_URL}/init`, { method: 'POST' });
    console.log("Database check/init requested");
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

  const registeredUser = await fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newUser)
  }).then(handleResponse);

  return registeredUser as User;
};

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  try {
    const user = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }).then(handleResponse);
    
    return user as User;
  } catch (error) {
    console.error("Login failed:", error);
    return null;
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