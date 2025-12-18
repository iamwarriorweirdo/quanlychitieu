
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum Category {
  FOOD = 'Food & Dining',
  TRANSPORT = 'Transportation',
  UTILITIES = 'Utilities',
  SHOPPING = 'Shopping',
  SALARY = 'Salary',
  TRANSFER = 'Transfer',
  ENTERTAINMENT = 'Entertainment',
  HEALTH = 'Health & Fitness',
  OTHER = 'Other'
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: string; // ISO String
  createdAt: number;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  email?: string;
  phone?: string;
  role?: 'admin' | 'user';
  googleId?: string;
  avatar?: string;
}

export interface ParsedTransactionData {
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // ISO Date String
  icon: string; // e.g., 'plane', 'home'
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number; // Planned amount
  period: string; // e.g., 'monthly'
}

export interface Investment {
  id: string;
  userId: string;
  symbol: string; // e.g., VCB, BTC, GOLD
  name: string;
  type: 'Stock' | 'Crypto' | 'RealEstate' | 'Gold' | 'Fund' | 'Other';
  quantity: number;
  unit?: string; // e.g., 'Lượng', 'Chỉ', 'Cổ phiếu', 'Coin'
  buyPrice: number; // Giá mua trung bình
  currentPrice: number; // Giá thị trường hiện tại
  date: string; // Ngày mua ban đầu
}

export interface InvestmentSecurity {
  userId: string;
  hasPassword: boolean;
  isOtpEnabled: boolean;
  email?: string;
}