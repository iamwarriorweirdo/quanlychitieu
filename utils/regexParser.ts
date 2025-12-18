
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
  // Regex nâng cao cho các con số có dấu chấm/phẩy phân cách hàng nghìn
  const amountRegex = /\b\d{1,3}(?:[.,]\d{3})+(?:\s?[đdĐ]|\s?VND)?\b/gi; 
  const potentialAmounts: string[] = text.match(amountRegex) || [];
  
  // Tìm các số dài đứng riêng lẻ (thường là tiền lương trong bảng tính)
  const plainNumberRegex = /\b\d{5,12}\b/g;
  const plainNumbers: string[] = text.match(plainNumberRegex) || [];

  let maxAmount = 0;
  
  // Xử lý các số có định dạng (1.000.000)
  potentialAmounts.forEach((str) => {
     const cleanStr = str.replace(/[^\d]/g, '');
     const num = parseFloat(cleanStr);
     if (!isNaN(num) && num > maxAmount) maxAmount = num;
  });

  // Xử lý các số thuần túy (12604981)
  plainNumbers.forEach((str) => {
      const num = parseFloat(str);
      if (!isNaN(num) && num > maxAmount) maxAmount = num;
  });

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

  // 3. Logic phân loại
  let type = TransactionType.EXPENSE;
  let category = Category.OTHER;
  let description = "Quét dữ liệu (Offline)";

  // Kiểm tra bảng lương
  const isPayroll = normalized.includes('luong') || normalized.includes('payslip') || normalized.includes('net salary') || normalized.includes('thuc lanh');

  if (isPayroll) {
      type = TransactionType.INCOME;
      category = Category.SALARY;
      description = "Thu nhập từ bảng lương (Offline)";
  } else {
      // Kiểm tra thu nhập thông thường
      const hasIncomeKeywords = (
          normalized.includes('nhan tien') || 
          (normalized.includes('cong ') && !normalized.includes('tong cong')) || 
          normalized.includes('salary') || 
          normalized.includes('tk chinh')
      );

      if (hasIncomeKeywords) {
          type = TransactionType.INCOME;
          category = Category.SALARY;
          description = "Thu nhập / Lương (Offline)";
      }
  }

  // Phân loại hạng mục chi tiết cho EXPENSE (Nếu ko phải lương)
  if (type === TransactionType.EXPENSE) {
      if (normalized.includes('hoc') || normalized.includes('truong') || normalized.includes('lop')) {
          category = Category.OTHER;
          description = "Tiền học / Giáo dục";
      }
      else if (normalized.includes('sua') || normalized.includes('bim') || normalized.includes('tre em')) {
          category = Category.OTHER;
          description = "Bỉm sữa / Trẻ em";
      }
      else if (normalized.includes('dien') || normalized.includes('nuoc') || normalized.includes('internet')) {
          category = Category.UTILITIES;
          description = "Hóa đơn sinh hoạt";
      }
      else if (normalized.includes('an ') || normalized.includes('com') || normalized.includes('pho')) {
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
