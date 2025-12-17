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