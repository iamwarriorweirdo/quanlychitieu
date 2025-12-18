
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
      Bạn là chuyên gia phân tích hóa đơn và biên lai tài chính hàng đầu.
      Nhiệm vụ của bạn là trích xuất các giao dịch (Thu nhập hoặc Chi tiêu) từ hình ảnh hóa đơn hoặc văn bản OCR.

      HƯỚNG DẪN CHI TIẾT CHO HÓA ĐƠN/BIÊN LAI (VIỆT NAM):
      1. Tìm số tiền giao dịch thực tế:
         - Ưu tiên các từ khóa: "Tổng cộng", "Thanh toán", "Thành tiền", "Tổng tiền thanh toán", "Tiền mặt", "Chuyển khoản".
         - Nếu có dòng "Giảm giá" hoặc "Chiết khấu", hãy lấy số tiền cuối cùng sau khi đã giảm (số tiền khách phải trả).
         - Trường hợp đặc biệt: Nếu hóa đơn có đóng dấu "NỢ HÓA ĐƠN" hoặc "Số tiền thanh toán: 0", hãy xem xét liệu người dùng muốn ghi nhận giá trị hóa đơn (tổng trước giảm) hay số tiền thực chi (0). Tuy nhiên, thông thường trong quản lý thu chi, chúng ta ghi nhận GIÁ TRỊ GIAO DỊCH thực tế của món hàng/dịch vụ đó. Hãy trích xuất con số phản ánh đúng giá trị tiêu dùng nhất.

      2. Phân loại hạng mục (Category):
         - Ăn uống (Food & Dining): Nhà hàng, cafe, trà sữa, siêu thị thực phẩm.
         - Di chuyển (Transportation): Xăng dầu, grab, taxi, sửa xe.
         - Hóa đơn (Utilities): Điện, nước, internet, rác.
         - Mua sắm (Shopping): Quần áo, đồ gia dụng, mỹ phẩm.
         - Sức khỏe (Health & Fitness): Nhà thuốc, bệnh viện, phòng gym.
         - Giải trí (Entertainment): Xem phim, game, du lịch.
         - Khác (Other): Nếu không rõ ràng.

      3. Thông tin ngày tháng:
         - Tìm ngày giao dịch trên hóa đơn (dd/mm/yyyy). Nếu không có, dùng ngày hiện tại.

      ĐỊNH DẠNG TRẢ VỀ: Một mảng JSON các giao dịch.
      Ví dụ: [{"amount": 2614000, "type": "EXPENSE", "category": "Food & Dining", "description": "Hóa đơn Ăn uống Phú Thịnh", "date": "2018-11-19T18:30:00Z"}]
    `;

    const parts = [];
    if (ocrText && ocrText.trim().length > 0) {
      parts.push({ text: `DỮ LIỆU VĂN BẢN OCR:\n${ocrText}` });
    }

    if (imageBase64 && imageBase64.startsWith('data:')) {
       const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
       if (matches) {
         parts.push({
           inlineData: {
             mimeType: matches[1],
             data: matches[2]
           }
         });
       }
    }

    parts.push({ text: "Hãy phân tích kỹ ảnh hóa đơn này. Đặc biệt chú ý dòng 'Tổng cộng', 'Tổng' hoặc 'Thành tiền'. Nếu có giảm giá về 0 nhưng giá trị gốc rõ ràng, hãy trích xuất giá trị giao dịch đó." });

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
                enum: [
                  "Food & Dining", "Transportation", "Utilities", "Shopping", 
                  "Salary", "Transfer", "Entertainment", "Health & Fitness", "Other"
                ]
              },
              description: { type: Type.STRING },
              date: { type: Type.STRING }
            },
            required: ["amount", "type", "category", "description", "date"],
          }
        },
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("AI không phản hồi dữ liệu.");

    res.status(200).json(JSON.parse(resultText));

  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Phân tích AI thất bại: " + error.message });
  }
}
