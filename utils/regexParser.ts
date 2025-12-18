
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
  
  // Từ khóa tìm kiếm số tiền
  const keywords = ['tong', 'thanh toan', 'thanh tien', 'gia tri', 'total', 'net'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normLine = normalizeText(line);

    if (keywords.some(k => normLine.includes(k))) {
      // Tìm số tiền trong dòng này hoặc 2 dòng tiếp theo
      const checkBlock = lines.slice(i, i + 3).join(' ');
      const moneyMatches = checkBlock.match(/[\d.,]{5,12}/g);
      
      if (moneyMatches) {
        // Lấy số cuối cùng trong cụm từ khóa (thường là kết quả tổng)
        const lastMatch = moneyMatches[moneyMatches.length - 1];
        const val = parseInt(lastMatch.replace(/[.,]/g, ''));
        if (!isNaN(val) && val > amount && val < 100000000) {
          amount = val;
        }
      }
    }
  }

  // Fallback: Nếu vẫn bằng 0, lấy số lớn nhất hợp lệ
  if (amount === 0) {
    const allNumbers = text.match(/\b\d{1,3}(?:[.,]\d{3})+\b|\b\d{5,9}\b/g);
    if (allNumbers) {
      const vals = allNumbers.map(n => parseInt(n.replace(/[.,]/g, ''))).filter(v => v < 50000000);
      amount = vals.length > 0 ? Math.max(...vals) : 0;
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

  return { amount, type, category, description, date: dateStr };
};
