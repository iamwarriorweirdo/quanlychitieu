
import { ParsedTransactionData, TransactionType, Category } from '../types';

// Helper: Xóa dấu tiếng Việt và chuẩn hóa text để so sánh
function normalizeText(str: string): string {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

export const parseWithRegex = (text: string): ParsedTransactionData => {
  const normalized = normalizeText(text);
  
  // 1. OCR Cleaning: Thường OCR nhầm 'l', 'I', 'o' thành số trong các chuỗi số
  // Chúng ta sẽ cố gắng tìm các cụm số tiềm năng
  const lines = text.split('\n');
  let potentialAmounts: number[] = [];

  lines.forEach(line => {
      // Tìm các chuỗi số có thể có dấu phân cách hoặc không
      // Hỗ trợ cả 12.604.981 và 12604981
      const matches = line.match(/\b\d{1,3}(?:[.,]\d{3})*\b|\b\d{5,12}\b/g);
      if (matches) {
          matches.forEach(m => {
              const clean = m.replace(/[.,]/g, '');
              const val = parseInt(clean);
              if (!isNaN(val) && val > 1000) { // Bỏ qua các số quá nhỏ (như mã số, thứ tự)
                  potentialAmounts.push(val);
              }
          });
      }
  });

  // 2. Phân loại tài liệu
  const isPayroll = normalized.includes('luong') || 
                     normalized.includes('payslip') || 
                     normalized.includes('net salary') || 
                     normalized.includes('thuc lanh') ||
                     normalized.includes('thu nhap');

  let type = isPayroll ? TransactionType.INCOME : TransactionType.EXPENSE;
  let category = isPayroll ? Category.SALARY : Category.OTHER;
  let description = isPayroll ? "Lương thực lãnh (Quét Offline)" : "Chi tiêu (Quét Offline)";
  let amount = 0;

  if (isPayroll) {
      // Trong bảng lương, con số "thực lãnh" thường là số lớn nhất hoặc số cuối cùng
      // Chúng ta sẽ lấy số lớn nhất tìm thấy
      amount = potentialAmounts.length > 0 ? Math.max(...potentialAmounts) : 0;
  } else {
      // Với hóa đơn thông thường, lấy số lớn nhất (thường là tổng tiền)
      amount = potentialAmounts.length > 0 ? Math.max(...potentialAmounts) : 0;
  }

  // 3. Tìm ngày (nếu có)
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

  return {
    amount,
    type,
    category,
    description,
    date: dateStr
  };
};
