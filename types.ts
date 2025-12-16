export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum Category {
  FOOD = 'Ăn uống',
  TRANSPORT = 'Di chuyển',
  UTILITIES = 'Hóa đơn & Tiện ích',
  SHOPPING = 'Mua sắm',
  SALARY = 'Lương',
  TRANSFER = 'Chuyển khoản',
  ENTERTAINMENT = 'Giải trí',
  HEALTH = 'Sức khỏe',
  OTHER = 'Khác'
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
  password?: string; // Added password field
}

export interface ParsedTransactionData {
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: string;
}
