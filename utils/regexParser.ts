
import { ParsedTransactionData, TransactionType, Category } from '../types';

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
  const lines = text.split('\n');
  
  let amount = 0;
  let type = TransactionType.EXPENSE;
  let category = Category.OTHER;
  let description = "Chi tiêu (Quét Offline)";
  
  // 1. Phân loại loại tài liệu
  const isPayroll = normalized.includes('luong') || normalized.includes('payslip') || normalized.includes('thuc lanh');
  if (isPayroll) {
    type = TransactionType.INCOME;
    category = Category.SALARY;
    description = "Lương thực lãnh (Quét Offline)";
  }

  // 2. Tìm số tiền dựa trên từ khóa quan trọng (Tong cong, Thanh toan...)
  const amountKeywords = ['tong cong', 'thanh toan', 'tong tien', 'thanh tien', 'total', 'net salary', 'thuc lanh'];
  
  for (let line of lines) {
    const normLine = normalizeText(line);
    if (amountKeywords.some(kw => normLine.includes(kw))) {
      // Tìm số trong cùng dòng hoặc dòng tiếp theo
      const matches = line.match(/[\d.,]{5,}/g);
      if (matches) {
        const clean = matches[matches.length - 1].replace(/[.,]/g, '');
        const val = parseInt(clean);
        if (!isNaN(val) && val > amount) {
          amount = val;
        }
      }
    }
  }

  // Nếu không tìm thấy qua từ khóa, mới lấy số lớn nhất (trừ các số có vẻ là số hóa đơn dài)
  if (amount === 0) {
    let potentialAmounts: number[] = [];
    lines.forEach(line => {
      const matches = line.match(/\b\d{1,3}(?:[.,]\d{3})*\b|\b\d{5,9}\b/g);
      if (matches) {
        matches.forEach(m => {
          const val = parseInt(m.replace(/[.,]/g, ''));
          if (!isNaN(val) && val > 1000 && val < 100000000) { // Giới hạn 100tr để tránh số ID hóa đơn
            potentialAmounts.push(val);
          }
        });
      }
    });
    amount = potentialAmounts.length > 0 ? Math.max(...potentialAmounts) : 0;
  }

  // 3. Tìm ngày
  let dateStr = new Date().toISOString();
  const dateRegex = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    const d = new Date(`${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`);
    if (!isNaN(d.getTime())) dateStr = d.toISOString();
  }

  return { amount, type, category, description, date: dateStr };
};
