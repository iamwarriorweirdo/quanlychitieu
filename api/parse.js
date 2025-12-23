
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const apiKey = process.env.API_KEY ? process.env.API_KEY.trim() : null;

  if (!apiKey) {
    console.error("Server Error: Missing API_KEY environment variable.");
    return res.status(500).json({ error: "Server Configuration Error: API_KEY is missing." });
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const { ocrText, imageBase64 } = req.body;

  try {
    const systemPrompt = `
      Bạn là chuyên gia phân tích hóa đơn (OCR Expense Analyzer) chuyên nghiệp. Nhiệm vụ của bạn là trích xuất chính xác giá trị giao dịch cuối cùng từ hình ảnh hóa đơn hoặc văn bản OCR.

      QUY TẮC PHÂN TÍCH VÀ TÍNH TOÁN (ƯU TIÊN THEO THỨ TỰ):

      1. XÁC ĐỊNH TỔNG GIÁ TRỊ THANH TOÁN (FINAL AMOUNT):
         - Tìm các từ khóa: "Tổng tiền", "Tổng cộng", "Thanh toán", "Tiền khách trả", "Total", "Grand Total", "Amount Due".
         - Nếu có nhiều giá trị tổng (ví dụ: Tổng tiền hàng vs Tổng thanh toán), hãy lấy con số CUỐI CÙNG mà khách hàng thực sự phải trả.

      2. XỬ LÝ CHIẾT KHẤU & KHUYẾN MÃI (DISCOUNTS):
         - Nếu thấy dòng "Khuyến mãi", "Giảm giá", "Ưu đãi", "Discount", "Promotion" có giá trị số:
           + Nếu "Tổng thanh toán" đã bao gồm giảm giá: Giữ nguyên số đó.
           + Nếu "Tổng thanh toán" là tổng trước giảm: BẮT BUỘC lấy [Tổng] trừ đi [Giảm giá] để ra con số cuối cùng.

      3. XỬ LÝ THUẾ (VAT/TAX):
         - Nếu thấy dòng "Thuế", "VAT", "Tax" (%) hoặc số tiền cụ thể:
           + Công thức xác thực: Final Amount = (Tổng tiền hàng) + (Thuế) - (Khuyến mãi).
           + Đảm bảo con số "amount" trả về là con số sau cùng nhất.

      4. TRƯỜNG HỢP KHÔNG CÓ DÒNG TỔNG CỘNG:
         - Nếu hóa đơn chỉ là một danh sách các món hàng mà không có dòng tổng kết:
           + Bạn phải tự cộng tất cả các giá trị ở cột "Thành tiền" hoặc "Giá" của từng món hàng để tạo ra một giao dịch tổng duy nhất.

      5. KIỂM TRA CHÉO TOÁN HỌC (BẮT BUỘC):
         - Với mỗi dòng hàng: Kiểm tra [Số lượng] x [Đơn giá] = [Thành tiền]. 
         - Nếu OCR đọc sai (ví dụ 3 nhầm thành 5), hãy dùng kết quả phép nhân để đính chính con số đúng.
         - Cộng tất cả "Thành tiền" của các món hàng, so sánh với "Tổng cộng" trên bill. Nếu lệch, hãy ưu tiên logic toán học từ các món hàng chi tiết.

      ĐỊNH DẠNG TRẢ VỀ: Một mảng JSON các giao dịch (thường là 1 giao dịch tổng cho 1 hóa đơn).
      Ví dụ: [{"amount": 203500, "type": "EXPENSE", "category": "Food & Dining", "description": "Hóa đơn Siêu thị Co.opmart", "date": "2022-07-24T19:56:00Z"}]
      
      LƯU Ý: Nếu là hóa đơn siêu thị có nhiều món hàng, hãy gom thành 1 giao dịch duy nhất với mô tả chung (ví dụ: "Hóa đơn Saigon Co.op").
    `;

    const parts = [];
    if (ocrText) parts.push({ text: `Dữ liệu văn bản OCR (Có thể chứa sai sót, hãy đối chiếu với ảnh): \n${ocrText}` });
    
    if (imageBase64 && imageBase64.startsWith('data:')) {
       const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
       if (matches) {
         parts.push({
           inlineData: { mimeType: matches[1], data: matches[2] }
         });
       }
    }

    parts.push({ text: "Hãy phân tích kỹ các dòng 'Tổng tiền', 'Giảm giá' và 'VAT' trong ảnh. Thực hiện tính toán lại thủ công: Tổng các món hàng - Giảm giá + Thuế để đảm bảo 'amount' là con số khách hàng thực trả cuối cùng." });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, description: "Số tiền cuối cùng khách thực trả (sau thuế, sau giảm giá)" },
              type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
              category: { 
                type: Type.STRING, 
                enum: ["Food & Dining", "Transportation", "Utilities", "Shopping", "Salary", "Transfer", "Entertainment", "Health & Fitness", "Other"]
              },
              description: { type: Type.STRING, description: "Tên cửa hàng hoặc nội dung tổng quát của hóa đơn" },
              date: { type: Type.STRING, description: "Ngày giờ trên hóa đơn định dạng ISO" }
            },
            required: ["amount", "type", "category", "description", "date"],
          }
        },
      }
    });

    const result = JSON.parse(response.text);
    res.status(200).json(result);
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Lỗi AI phân tích hóa đơn: " + error.message });
  }
}
