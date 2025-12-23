
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const apiKey = process.env.API_KEY ? process.env.API_KEY.trim() : null;

  if (!apiKey) {
    return res.status(500).json({ error: "Server Configuration Error: API_KEY is missing." });
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const { ocrText, imageBase64 } = req.body;

  try {
    const systemPrompt = `
      Bạn là chuyên gia kiểm toán tài chính và OCR hóa đơn. Nhiệm vụ của bạn là trích xuất GIÁ TRỊ THỰC TRẢ CUỐI CÙNG (FINAL AMOUNT) từ hóa đơn.

      QUY TRÌNH PHÂN TÍCH TOÁN HỌC (BẮT BUỘC):
      1. TÌM CÁC GIÁ TRỊ CƠ BẢN:
         - Tổng tiền hàng (Subtotal / Tổng cộng / Tổng tiền).
         - Thuế (VAT / Thuế GTGT) dạng % hoặc số tiền cụ thể.
         - Khuyến mãi (Giảm giá / Chiết khấu / Ưu đãi / Discount).
         - Tiền khách trả (Amount Paid / Cash / Thanh toán).

      2. THUẬT TOÁN XÁC MINH (CROSS-CHECK):
         - Nếu có dòng "Tiền khách trả" hoặc "Thanh toán" hoặc "Tổng thanh toán": Đây là ưu tiên số 1.
         - Nếu không rõ ràng, hãy thực hiện phép tính:
           [GIÁ TRỊ CUỐI] = [Tổng tiền chi tiết các món] + [Tiền Thuế VAT] - [Tổng tiền giảm giá].
         - Kiểm tra lại: Cộng tất cả các món hàng trong hóa đơn. Nếu tổng các món hàng khác với "Tổng cộng", hãy tìm xem có phí dịch vụ hay thuế nào chưa được tính không.

      3. XỬ LÝ HÓA ĐƠN NHIỀU MÓN (NHƯ CO.OPMART):
         - Nhận diện các dòng có giá trị âm hoặc ghi "giảm giá" để khấu trừ.
         - Loại bỏ các con số rác như: mã vạch, số hóa đơn (HD), số quầy, ngày giờ (không nhầm lẫn với số tiền).

      ĐỊNH DẠNG TRẢ VỀ: Một mảng JSON các giao dịch.
      Ví dụ: [{"amount": 203500, "type": "EXPENSE", "category": "Food & Dining", "description": "Co.opmart - Hóa đơn mua sắm", "date": "2022-07-24T19:56:00Z"}]
      
      LƯU Ý ĐẶC BIỆT: Nếu ảnh mờ, hãy dựa vào logic: (Đơn giá x Số lượng = Thành tiền) để khôi phục con số đúng.
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
              amount: { type: Type.NUMBER, description: "Con số thực tế khách đã trả sau khi trừ khuyến mãi và cộng thuế" },
              type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
              category: { 
                type: Type.STRING, 
                enum: ["Food & Dining", "Transportation", "Utilities", "Shopping", "Salary", "Transfer", "Entertainment", "Health & Fitness", "Other"]
              },
              description: { type: Type.STRING, description: "Tên cửa hàng + Loại hóa đơn" },
              date: { type: Type.STRING, description: "ISO Date" }
            },
            required: ["amount", "type", "category", "description", "date"],
          }
        },
      }
    });

    const result = JSON.parse(response.text);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Lỗi phân tích: " + error.message });
  }
}
