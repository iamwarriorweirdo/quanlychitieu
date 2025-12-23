
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
    // CẬP NHẬT SYSTEM PROMPT CHO ĐA HÓA ĐƠN
    const systemPrompt = `
      Bạn là chuyên gia OCR hóa đơn thông minh.
      
      NHIỆM VỤ ĐẶC BIỆT: PHÁT HIỆN NHIỀU HÓA ĐƠN (MULTI-RECEIPT DETECTION)
      1. Phân tích bố cục hình ảnh. Có thể có 2 hoặc nhiều hóa đơn nằm cạnh nhau (trái/phải) hoặc trên/dưới.
      2. Hãy tách biệt nội dung của từng hóa đơn dựa trên khoảng trắng và sự căn chỉnh văn bản.
      3. Với MỖI hóa đơn tìm được, hãy tạo ra một đối tượng giao dịch riêng biệt trong mảng kết quả.

      QUY TẮC TRÍCH XUẤT CHO TỪNG HÓA ĐƠN:
      - Tên cửa hàng (Store Name): Thường ở dòng đầu tiên của mỗi cụm hóa đơn.
      - Tổng tiền (Total Amount): Tìm dòng "Tổng cộng", "Thành tiền", "Total" lớn nhất trong cụm đó.
      - Thời gian: Tìm ngày/giờ trên cụm đó (nếu không có, dùng thời gian hiện tại).
      - Logic Toán học: Nếu không tìm thấy chữ "Tổng cộng", hãy cộng dồn các dòng giá tiền lớn trong cụm đó.

      ĐỊNH DẠNG TRẢ VỀ: Mảng JSON chứa các object.
      Ví dụ ảnh có 2 hóa đơn:
      [
        {"amount": 180000, "description": "Quán Khói - Ăn uống", "category": "Food & Dining", ...},
        {"amount": 117000, "description": "Ốc Vàng - Ăn uống", "category": "Food & Dining", ...}
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
              amount: { type: Type.NUMBER, description: "Final amount paid for this specific receipt" },
              type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
              category: { 
                type: Type.STRING, 
                enum: ["Food & Dining", "Transportation", "Utilities", "Shopping", "Salary", "Transfer", "Entertainment", "Health & Fitness", "Other"]
              },
              description: { type: Type.STRING, description: "Store Name + Type" },
              date: { type: Type.STRING, description: "ISO Date found on this receipt" }
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
