
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
      Bạn là chuyên gia phân tích tài chính AI cấp cao, chuyên trách trích xuất dữ liệu từ hóa đơn in nhiệt (thermal receipts).
      
      QUY TẮC XÁC THỰC TOÁN HỌC (BẮT BUỘC):
      1. KIỂM TRA CHÉO DÒNG: Với mỗi món hàng, bạn PHẢI thực hiện: [Số lượng] x [Đơn giá] = [Thành tiền]. 
         - Nếu kết quả tính toán (SLxĐG) khác với con số đọc được ở cột Thành tiền (TT), hãy rà soát lại hình ảnh. 
         - ĐẶC BIỆT LƯU Ý: Số 3 và số 5 thường bị nhầm lẫn trong OCR hóa đơn. Nếu phép tính SLxĐG ra kết quả có số 5 nhưng bạn đọc thấy số 3 (hoặc ngược lại), hãy ưu tiên con số khớp với logic toán học.
      
      2. KIỂM TRA TỔNG BILL: Cộng tất cả các dòng [Thành tiền] và đối chiếu với dòng [Tổng cộng] hoặc [Thành tiền] cuối hóa đơn.
         - Nếu tổng các dòng khác với con số ở dòng Tổng cộng, hãy kiểm tra lại từng chữ số của các món có giá trị cao.
      
      3. PHÂN TÍCH NGỮ CẢNH: 
         - Ví dụ: Nếu một món giá thường là 50.000 nhưng OCR đọc là 30.000, hãy kiểm tra lại sự logic của toàn bộ hóa đơn.
         - Giá trị trích xuất phải là con số nguyên (Integer), không bao gồm dấu chấm/phẩy phân cách.

      ĐỊNH DẠNG TRẢ VỀ: Một mảng JSON các giao dịch.
      Ví dụ: [{"amount": 2614000, "type": "EXPENSE", "category": "Food & Dining", "description": "Hóa đơn Ăn uống Phú Thịnh", "date": "2018-11-19T18:30:00Z"}]
    `;

    const parts = [];
    if (ocrText) parts.push({ text: `Dữ liệu văn bản gợi ý (có thể sai số): \n${ocrText}` });
    
    if (imageBase64 && imageBase64.startsWith('data:')) {
       const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
       if (matches) {
         parts.push({
           inlineData: { mimeType: matches[1], data: matches[2] }
         });
       }
    }

    parts.push({ text: "HÃY CẨN THẬN: Các số 3 và 5 trong ảnh này rất dễ nhầm. Hãy tính lại SL x ĐG cho từng món (ví dụ món Cá Mú 11 x 51,000) để xác định con số chính xác nhất trước khi trả về kết quả." });

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
              amount: { type: Type.NUMBER, description: "Số tiền cuối cùng sau khi đã kiểm tra logic toán học" },
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

    const result = JSON.parse(response.text);
    res.status(200).json(result);
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Lỗi AI: " + error.message });
  }
}
