
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
    const systemPrompt = `
      Bạn là chuyên gia OCR hóa đơn. Nhiệm vụ: Trích xuất GIÁ TRỊ THỰC TRẢ CUỐI CÙNG (FINAL AMOUNT) từ hình ảnh/văn bản.

      QUY TẮC XỬ LÝ NHANH:
      1. Tìm dòng "Tổng cộng", "Thành tiền", "Total", "Thanh toán".
      2. Nếu có "Giảm giá" hoặc "Discount", hãy trừ đi (nếu hóa đơn chưa trừ).
      3. Nếu có "VAT" hoặc "Thuế", hãy cộng vào (nếu hóa đơn chưa cộng).
      4. Bỏ qua các mã vạch, số điện thoại, ngày tháng. Chỉ lấy con số tiền tệ lớn nhất hợp lý.

      ĐỊNH DẠNG TRẢ VỀ: Mảng JSON.
      Ví dụ: [{"amount": 203500, "type": "EXPENSE", "category": "Food & Dining", "description": "Hóa đơn mua sắm", "date": "2024-01-30T10:00:00Z"}]
    `;

    const parts = [];
    if (ocrText) parts.push({ text: `Văn bản OCR: \n${ocrText}` });
    
    if (imageBase64 && imageBase64.startsWith('data:')) {
       const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
       if (matches) {
         parts.push({
           inlineData: { mimeType: matches[1], data: matches[2] }
         });
       }
    }

    // SỬ DỤNG GEMINI FLASH LITE (TỐI ƯU TOKEN & TỐC ĐỘ)
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
              description: { type: Type.STRING, description: "Short description" },
              date: { type: Type.STRING, description: "ISO Date" }
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
