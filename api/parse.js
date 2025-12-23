
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // Hỗ trợ cả API_KEY (chuẩn) và CLIENT_KEY (do người dùng cấu hình trên Vercel)
  const apiKey = (process.env.API_KEY || process.env.CLIENT_KEY || "").trim();

  if (!apiKey) {
    return res.status(500).json({ error: "Server Configuration Error: API_KEY/CLIENT_KEY is missing." });
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const { ocrText, imageBase64 } = req.body;

  try {
    // CẬP NHẬT SYSTEM PROMPT CHO ĐA HÓA ĐƠN VÀ THỜI GIAN CHÍNH XÁC
    const systemPrompt = `
      Bạn là chuyên gia OCR hóa đơn thông minh.
      
      NHIỆM VỤ 1: PHÁT HIỆN NHIỀU HÓA ĐƠN (MULTI-RECEIPT DETECTION)
      - Phân tích bố cục hình ảnh. Nếu có nhiều hóa đơn, hãy tách biệt nội dung của từng hóa đơn.
      - Tạo ra một đối tượng giao dịch riêng biệt cho MỖI hóa đơn tìm thấy.

      NHIỆM VỤ 2: TRÍCH XUẤT DỮ LIỆU CHÍNH XÁC (ĐẶC BIỆT LÀ THỜI GIAN)
      - Tên cửa hàng: Dòng đầu tiên hoặc dòng có font chữ lớn nhất.
      - Tổng tiền: Tìm số tiền lớn nhất đi kèm từ khóa "Tổng", "Total", "Thành tiền".
      - THỜI GIAN (QUAN TRỌNG): 
        + Hãy tìm kỹ "Giờ:Phút" (HH:mm) in trên hóa đơn (VD: 14:30, 09:45 PM, 18:20).
        + Tìm "Ngày/Tháng/Năm".
        + KẾT HỢP Ngày + Giờ tìm được để tạo ra chuỗi ISO Date chính xác. 
        + CHỈ dùng thời gian hiện tại nếu trên hóa đơn HOÀN TOÀN KHÔNG in giờ.

      ĐỊNH DẠNG TRẢ VỀ: Mảng JSON.
      [
        {
          "amount": 180000, 
          "description": "Tên Quán", 
          "date": "2023-10-25T18:30:00.000Z" // Ưu tiên giờ trên hóa đơn (18:30)
        }
      ]
    `;

    const parts = [];
    if (ocrText) parts.push({ text: `Văn bản OCR (tham khảo): \n${ocrText}` });
    
    if (imageBase64 && imageBase64.startsWith('data:')) {
       const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
       if (matches) {
         parts.push({
           inlineData: { mimeType: matches[1], data: matches[2] }
         });
       }
    }

    // VẪN SỬ DỤNG GEMINI FLASH LITE (TỐI ƯU TOKEN & TỐC ĐỘ)
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest', 
      contents: { parts: parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              amount: { type: Type.NUMBER, description: "Final amount paid" },
              type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
              category: { 
                type: Type.STRING, 
                enum: ["Food & Dining", "Transportation", "Utilities", "Shopping", "Salary", "Transfer", "Entertainment", "Health & Fitness", "Other"]
              },
              description: { type: Type.STRING, description: "Store Name + Type" },
              date: { type: Type.STRING, description: "ISO Date String combined from Date and Time found on receipt" }
            },
            required: ["amount", "type", "category", "description", "date"],
          }
        },
      }
    });

    let resultText = response.text || "[]";
    if (resultText.startsWith('```json')) {
      resultText = resultText.replace(/^```json/, '').replace(/```$/, '');
    } else if (resultText.startsWith('```')) {
      resultText = resultText.replace(/^```/, '').replace(/```$/, '');
    }

    const result = JSON.parse(resultText);
    res.status(200).json(result);
  } catch (error) {
    console.error("Parse API Error:", error);
    res.status(500).json({ error: "Lỗi phân tích: " + error.message });
  }
}
