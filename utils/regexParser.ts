
import { ParsedTransactionData, TransactionType, Category } from '../types';

// Helper: Xóa dấu tiếng Việt để so sánh chính xác hơn
function removeVietnameseTones(str: string): string {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase();
}

export const parseWithRegex = (text: string): ParsedTransactionData => {
  const normalized = removeVietnameseTones(text);
  
  // 1. Tìm số tiền lớn nhất trong văn bản
  const amountRegex = /\b\d{1,3}(?:[.,]\d{3})+(?:\s?[đdĐ]|\s?VND)?\b/gi; 
  const potentialAmounts: string[] = text.match(amountRegex) || [];
  const plainNumberRegex = /\b\d{4,10}\b/g;
  const plainNumbers: string[] = text.match(plainNumberRegex) || [];

  let maxAmount = 0;
  potentialAmounts.forEach((str) => {
     const cleanStr = str.replace(/[^\d]/g, '');
     const num = parseFloat(cleanStr);
     if (!isNaN(num) && num > maxAmount) maxAmount = num;
  });

  if (maxAmount === 0) {
      plainNumbers.forEach((str) => {
          const num = parseFloat(str);
          if (!isNaN(num) && num > maxAmount) maxAmount = num;
      });
  }

  // 2. Tìm ngày tháng
  const dateRegex = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/;
  const dateMatch = text.match(dateRegex);
  let dateStr = new Date().toISOString(); 
  
  if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      const year = parseInt(dateMatch[3]);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const d = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`);
          if (!isNaN(d.getTime())) dateStr = d.toISOString();
      }
  }

  // 3. Logic phân loại nâng cao
  let type = TransactionType.EXPENSE;
  let category = Category.OTHER;
  let description = "Quét từ hóa đơn (Offline)";

  // Kiểm tra các từ khóa chi tiêu gia đình (Ưu tiên EXPENSE)
  const isLikelyExpense = 
      normalized.includes('tien ') || // Tiền học, tiền sữa, tiền điện...
      normalized.includes('chi phi') || 
      normalized.includes('mua ') || 
      normalized.includes('thanh toan') ||
      normalized.includes('tong chi');

  // Kiểm tra từ khóa thu nhập nhưng loại trừ "tổng cộng"
  const hasIncomeKeywords = (
      normalized.includes('nhan tien') || 
      (normalized.includes('cong ') && !normalized.includes('tong cong')) || // Chỉ nhận 'cộng' nếu ko có 'tổng'
      normalized.includes('salary') || 
      normalized.includes('luong') || 
      normalized.includes('thu nhap') ||
      normalized.includes('tk chinh')
  );

  if (hasIncomeKeywords && !isLikelyExpense) {
      type = TransactionType.INCOME;
      category = Category.SALARY;
      description = "Thu nhập / Lương (Tự động)";
  }

  // Phân loại hạng mục chi tiết cho EXPENSE
  if (type === TransactionType.EXPENSE) {
      if (normalized.includes('hoc') || normalized.includes('truong') || normalized.includes('lop')) {
          category = Category.OTHER;
          description = "Tiền học / Giáo dục";
      }
      else if (normalized.includes('sua') || normalized.includes('bim') || normalized.includes('tre em')) {
          category = Category.OTHER;
          description = "Bỉm sữa / Trẻ em";
      }
      else if (normalized.includes('grab') || normalized.includes('taxi') || normalized.includes('xang')) {
          category = Category.TRANSPORT;
          description = "Di chuyển / Xăng xe";
      }
      else if (normalized.includes('shopee') || normalized.includes('sieu thi') || normalized.includes('cho ')) {
          category = Category.SHOPPING;
          description = "Đi chợ / Mua sắm";
      }
      else if (normalized.includes('dien') || normalized.includes('nuoc') || normalized.includes('gas') || normalized.includes('internet')) {
          category = Category.UTILITIES;
          description = "Hóa đơn sinh hoạt";
      }
      else if (normalized.includes('an ') || normalized.includes('com') || normalized.includes('pho') || normalized.includes('thuc an')) {
          category = Category.FOOD;
          description = "Ăn uống / Thực phẩm";
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
