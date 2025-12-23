
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
  const lines = text.split('\n');
  const normalizedText = normalizeText(text);
  
  let subtotal = 0;
  let tax = 0;
  let discount = 0;
  let finalAmount = 0;
  
  let type = TransactionType.EXPENSE;
  let category = Category.OTHER;
  let description = "Chi tiêu (Quét Offline)";

  // 1. Tìm các con số có khả năng là tiền (từ 4 chữ số trở lên)
  const findMoney = (line: string) => {
    const matches = line.match(/[\d.,]{4,15}/g);
    if (!matches) return 0;
    const lastMatch = matches[matches.length - 1];
    return parseInt(lastMatch.replace(/[.,]/g, '')) || 0;
  };

  // 2. Duyệt từng dòng để tìm từ khóa
  for (let line of lines) {
    const normLine = normalizeText(line);
    const value = findMoney(line);

    if (value === 0) continue;

    if (normLine.includes('tong tien') || normLine.includes('thanh toan') || normLine.includes('tong cong')) {
        if (value > finalAmount) finalAmount = value;
    }
    
    if (normLine.includes('giam gia') || normLine.includes('khuyen mai') || normLine.includes('uudai')) {
        discount = value;
    }

    if (normLine.includes('vat') || normLine.includes('thue')) {
        // Chỉ lấy nếu không phải là % (ví dụ 8%)
        if (!normLine.includes('%')) tax = value;
    }
  }

  // 3. Logic tính toán cuối cùng (nếu finalAmount chưa chuẩn)
  // Nếu tìm thấy các món hàng riêng lẻ mà không thấy tổng, hãy cộng dồn
  if (finalAmount === 0) {
      const allValues = lines.map(l => findMoney(l)).filter(v => v > 1000 && v < 50000000);
      if (allValues.length > 0) {
          finalAmount = Math.max(...allValues); // Tạm lấy số lớn nhất
      }
  }

  // 4. Ưu tiên số tiền lớn nhất tìm được nếu nó hợp lý
  const allPossibleAmounts = normalizedText.match(/\b\d{1,3}(?:[.,]\d{3})+\b|\b\d{5,10}\b/g);
  if (allPossibleAmounts) {
      const vals = allPossibleAmounts.map(n => parseInt(n.replace(/[.,]/g, ''))).filter(v => v < 100000000);
      if (vals.length > 0) {
          const maxVal = Math.max(...vals);
          if (maxVal > finalAmount) finalAmount = maxVal;
      }
  }

  // Tìm ngày
  let dateStr = new Date().toISOString();
  const dateRegex = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    const d = new Date(`${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`);
    if (!isNaN(d.getTime())) dateStr = d.toISOString();
  }

  // Nếu là hóa đơn Co.op, thường category là Food
  if (normalizedText.includes('co.op') || normalizedText.includes('saigon co')) {
      category = Category.FOOD;
      description = "Hóa đơn Co.opmart";
  }

  return { 
    amount: finalAmount, 
    type, 
    category, 
    description, 
    date: dateStr 
  };
};
