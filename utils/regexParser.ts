
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
  
  let finalAmount = 0;
  let type = TransactionType.EXPENSE;
  let category = Category.OTHER;
  let description = "Chi tiêu (Quét Offline)";

  const cleanMoneyString = (str: string): number => {
    // Loại bỏ các ký tự không phải số, dấu chấm, dấu phẩy
    let cleaned = str.replace(/[^\d.,]/g, '');
    
    // Logic cho Việt Nam: Nếu có dạng XXX.000 hoặc XXX,000 -> bỏ dấu phân cách và giữ nguyên số
    // Nếu chuỗi có nhiều dấu phân cách (1.000.000) -> chắc chắn là phân cách hàng nghìn
    const dotCount = (cleaned.match(/\./g) || []).length;
    const commaCount = (cleaned.match(/,/g) || []).length;

    if (dotCount > 1 || commaCount > 1) {
        return parseInt(cleaned.replace(/[.,]/g, '')) || 0;
    }

    // Nếu chỉ có 1 dấu phân cách và sau đó là đúng 3 chữ số -> ưu tiên là hàng nghìn
    if (cleaned.match(/[.,]\d{3}$/)) {
        return parseInt(cleaned.replace(/[.,]/g, '')) || 0;
    }

    // Fallback mặc định
    return parseInt(cleaned.replace(/[.,]/g, '')) || 0;
  };

  const findMoney = (line: string) => {
    // Tìm các cụm số có phân cách
    const matches = line.match(/[\d.,]{4,15}/g);
    if (!matches) return 0;
    // Thường số tiền tổng nằm ở cuối dòng hoặc là số lớn nhất
    return cleanMoneyString(matches[matches.length - 1]);
  };

  for (let line of lines) {
    const normLine = normalizeText(line);
    const value = findMoney(line);

    if (value === 0) continue;

    if (normLine.includes('tong tien') || normLine.includes('thanh toan') || normLine.includes('tong cong') || normLine.includes('sodu')) {
        if (value > finalAmount) finalAmount = value;
    }
    
    // Nhận diện biến động số dư ngân hàng Việt Nam (+ hoặc -)
    if (line.includes('+')) type = TransactionType.INCOME;
    if (line.includes('-')) type = TransactionType.EXPENSE;
  }

  // Tìm tất cả các số có vẻ là tiền và lấy số lớn nhất nếu chưa tìm thấy finalAmount
  if (finalAmount === 0) {
      const allPossibleAmounts = text.match(/[\d.,]{4,15}/g);
      if (allPossibleAmounts) {
          const vals = allPossibleAmounts.map(n => cleanMoneyString(n)).filter(v => v < 500000000);
          if (vals.length > 0) {
              finalAmount = Math.max(...vals);
          }
      }
  }

  const now = new Date();
  let dateObj = now;
  const dateRegex = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/;
  const dateMatch = text.match(dateRegex);
  
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]) - 1;
    const year = parseInt(dateMatch[3]);
    dateObj = new Date(year, month, day, 12, 0, 0); 
  }

  const timeRegex = /\b([0-1]?[0-9]|2[0-3])\s*[:hg]\s*([0-5][0-9])\b/;
  const timeMatch = text.match(timeRegex);

  if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = parseInt(timeMatch[2]);
      dateObj.setHours(hours);
      dateObj.setMinutes(minutes);
      dateObj.setSeconds(0);
  }

  if (normalizedText.includes('momo')) {
      description = "Giao dịch MoMo";
      category = Category.TRANSFER;
  } else if (normalizedText.includes('vcb') || normalizedText.includes('vietcombank')) {
      description = "Giao dịch Vietcombank";
      category = Category.TRANSFER;
  }

  return { 
    amount: finalAmount, 
    type, 
    category, 
    description, 
    date: dateObj.toISOString() 
  };
};
