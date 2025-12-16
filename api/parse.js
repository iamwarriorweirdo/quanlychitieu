import Groq from "groq-sdk";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // Khởi tạo Groq SDK
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const { content, isImage } = req.body;

  try {
    let messages = [];

    const systemPrompt = `
      Bạn là trợ lý tài chính thông minh. Nhiệm vụ: Trích xuất thông tin giao dịch từ văn bản hoặc ảnh hóa đơn/chuyển khoản ngân hàng.
      
      Yêu cầu đầu ra JSON (chỉ trả về JSON, không markdown):
      {
        "amount": number (số tiền, luôn dương),
        "type": "INCOME" | "EXPENSE" (thu hoặc chi),
        "category": string (Ăn uống, Di chuyển, Mua sắm, Lương, Khác...),
        "description": string (Mô tả ngắn gọn tiếng Việt),
        "date": string (ISO 8601 YYYY-MM-DD)
      }
    `;

    if (isImage) {
      // Groq Vision (llama-3.2-11b-vision-preview)
      // Content input expected to include base64 data url
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: systemPrompt + " Hãy phân tích ảnh này." },
            { type: "image_url", image_url: { url: content } }
          ]
        }
      ];
    } else {
      // Text Mode
      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: content }
      ];
    }

    const completion = await groq.chat.completions.create({
      messages: messages,
      model: isImage ? "llama-3.2-11b-vision-preview" : "llama3-70b-8192",
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) throw new Error("No content returned");

    res.status(200).json(JSON.parse(result));

  } catch (error) {
    console.error("Groq Error:", error);
    res.status(500).json({ error: "AI Processing Failed" });
  }
}