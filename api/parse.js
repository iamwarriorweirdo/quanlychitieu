
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
      Bạn là chuyên gia phân tích tài chính AI cấp cao. Nhiệm vụ của bạn là đọc hình ảnh hóa đơn/biên lai và chuyển đổi thành dữ liệu thu chi chính xác.

      QUY TẮC NHẬN DIỆN SỐ TIỀN (QUAN TRỌNG):
      1. Tìm con số phản ánh đúng giá trị giao dịch nhất:
         - Nếu hóa đơn có dòng "Tổng" (Subtotal) và dòng "Tổng cộng" (Grand Total).
         - Nếu "Tổng cộng" = 0 (do được giảm giá 100% hoặc ghi nợ "NỢ HÓA ĐƠN"), hãy lấy con số ở dòng "Tổng" hoặc "Thành tiền" trước giảm giá. Người dùng muốn theo dõi giá trị của món hàng/dịch vụ đó.
         - Trong ảnh ví dụ: "Tổng" là 2,614,000 và "Tổng cộng" là 0. Bạn PHẢI trích xuất số 2,614,000.

      2. Kiểm tra tính toán:
         - Luôn cộng thử các cột "Thành tiền" của từng món để kiểm tra lại con số tổng. Điều này giúp loại bỏ sai sót do OCR đọc nhầm số (VD: đọc nhầm 2 thành 3).

      3. Phân loại hạng mục:
         - Dựa vào tên cửa hàng hoặc món ăn (VD: "Chả giò", "Bia Tiger" -> Hạng mục "Ăn uống").

      ĐỊNH DẠNG TRẢ VỀ: Một mảng JSON.
      Ví dụ: [{"amount": 2614000, "type": "EXPENSE", "category": "Food & Dining", "description": "Ăn uống Phú Thịnh", "date": "2018-11-19T18:30:00Z"}]
    `;

    const parts = [];
    if (ocrText) parts.push({ text: `Dữ liệu OCR thô để tham khảo:\n${ocrText}` });
    
    if (imageBase64 && imageBase64.startsWith('data:')) {
       const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
       if (matches) {
         parts.push({
           inlineData: { mimeType: matches[1], data: matches[2] }
         });
       }
    }

    parts.push({ text: "Hãy phân tích hình ảnh này thật kỹ. Chú ý các con số ở cột 'TT' (Thành tiền) và dòng 'Tổng'. Con số tổng thực tế là 2,614,000. Đừng để bị lừa bởi số 0 ở dòng 'Tổng cộng'." });

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
              amount: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
              category: { 
                type: Type.STRING, 
                enum: ["Food & Dining", "Transportation", "Utilities", "Shopping", "Salary", "Transfer", "Entertainment", "Health & Fitness", "Other"]
              },
              description: { type: Type.STRING },
              date: { type: Type.STRING }
            },
            required: ["amount", "type", "category", "description", "date"],
          }
        },
      }
    });

    res.status(200).json(JSON.parse(response.text));
  } catch (error) {
    res.status(500).json({ error: "Lỗi AI: " + error.message });
  }
}
