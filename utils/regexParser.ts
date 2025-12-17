import { ParsedTransactionData, TransactionType, Category } from '../types';

// Helper: Xóa dấu tiếng Việt để so sánh chính xác hơn (Lương -> luong)
function removeVietnameseTones(str: string): string {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase();
}

export const parseWithRegex = (text: string): ParsedTransactionData => {
  // Chuẩn hóa văn bản: Xóa dấu và chuyển về chữ thường
  // Ví dụ: "LƯƠNG CỐ ĐỊNH" -> "luong co dinh"
  const normalized = removeVietnameseTones(text);
  const originalLower = text.toLowerCase(); // Giữ bản có dấu để check regex số nếu cần
  
  // 1. Find Amount (Try to find patterns like 100.000, 500,000, 1.200.000)
  // Looks for digits followed by . or , and 3 digits (e.g. .000)
  const amountRegex = /\b\d{1,3}(?:[.,]\d{3})+(?:\s?[đdĐ]|\s?VND)?\b/gi; 
  const potentialAmounts: string[] = text.match(amountRegex) || [];
  
  // Also look for plain large numbers
  const plainNumberRegex = /\b\d{4,10}\b/g;
  const plainNumbers: string[] = text.match(plainNumberRegex) || [];

  let maxAmount = 0;

  // Process formatted amounts
  potentialAmounts.forEach((str) => {
     // Remove non-digit characters to parse
     const cleanStr = str.replace(/[^\d]/g, '');
     const num = parseFloat(cleanStr);
     if (!isNaN(num) && num > maxAmount) maxAmount = num;
  });

  // Process plain numbers if no formatted amount found or to compare
  if (maxAmount === 0) {
      plainNumbers.forEach((str) => {
          const num = parseFloat(str);
          if (!isNaN(num) && num > maxAmount) maxAmount = num;
      });
  }

  // 2. Find Date (DD/MM/YYYY or DD-MM-YYYY)
  const dateRegex = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/;
  const dateMatch = text.match(dateRegex);
  let dateStr = new Date().toISOString(); // Default to today
  
  if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      const year = parseInt(dateMatch[3]);
      // Basic validation
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          // Construct YYYY-MM-DD for ISO
          const d = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
          if (!isNaN(d.getTime())) {
              dateStr = d.toISOString();
          }
      }
  }

  // 3. Guess Category & Type based on Keywords
  // Mặc định là CHI TIÊU
  let type = TransactionType.EXPENSE;
  let category = Category.OTHER;
  let description = "Quét từ hóa đơn (Offline)";

  // Logic: Nếu tìm thấy từ khóa Thu nhập, đổi Type thành INCOME
  // Sử dụng chuỗi đã xóa dấu (normalized) để bắt "Lương", "Thưởng", "Cộng"
  if (
      normalized.includes('nhan tien') || 
      normalized.includes('cong') || // cộng
      normalized.includes('salary') || 
      normalized.includes('luong') || // lương
      normalized.includes('thu nhap') || // thu nhập
      normalized.includes('du') || // số dư / dư
      normalized.includes('tk chinh') // tk chính (thường là biến động số dư dương)
  ) {
      type = TransactionType.INCOME;
      category = Category.SALARY;
      description = "Thu nhập / Lương (Tự động)";
  }

  // Expense Category Keywords (Nếu vẫn là Expense thì mới phân loại)
  if (type === TransactionType.EXPENSE) {
      if (normalized.includes('grab') || normalized.includes('be group') || normalized.includes('taxi') || normalized.includes('xang') || normalized.includes('parking')) {
          category = Category.TRANSPORT;
          description = "Di chuyển / Xăng xe";
      }
      else if (normalized.includes('shopee') || normalized.includes('lazada') || normalized.includes('tiki') || normalized.includes('mart') || normalized.includes('sieu thi') || normalized.includes('circle k')) {
          category = Category.SHOPPING;
          description = "Mua sắm";
      }
      else if (normalized.includes('dien') || normalized.includes('nuoc') || normalized.includes('internet') || normalized.includes('viettel') || normalized.includes('vnpt')) {
          category = Category.UTILITIES;
          description = "Hóa đơn điện/nước/net";
      }
      else if (normalized.includes('cafe') || normalized.includes('coffee') || normalized.includes('tea') || normalized.includes('phuc long') || normalized.includes('highland') || normalized.includes('buncha') || normalized.includes('pho ')) {
          category = Category.FOOD;
          description = "Ăn uống";
      }
      else if (normalized.includes('chuyen tien') || normalized.includes('ck ') || normalized.includes('mb transfer')) {
           category = Category.TRANSFER;
           description = "Chuyển khoản";
      }
  }

  return {
    amount: maxAmount,
    type,
    category,
    description,
    date: dateStr
  };
};