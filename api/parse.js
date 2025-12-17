import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // 1. Explicitly check for API Key and TRIM whitespace (Fixes Vercel/Env issues)
  const apiKey = process.env.API_KEY ? process.env.API_KEY.trim() : null;

  if (!apiKey) {
    console.error("Server Error: Missing API_KEY environment variable.");
    return res.status(500).json({ error: "Server Configuration Error: API_KEY is missing. Please check .env file." });
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });
  const { ocrText, imageBase64, imageUrl } = req.body;

  try {
    // UPDATED PROMPT: Specific handling for Vietnamese Salary/Income context
    const systemPrompt = `
      You are a smart financial assistant specialized in analyzing Vietnamese financial documents (Receipts, Bank SMS, Salary Slips).
      Task: Extract transaction details from the provided input.
      
      CRITICAL LOGIC FOR "TYPE" (INCOME vs EXPENSE):
      1. **INCOME Detection**:
         - Keywords: "Lương" (Salary), "Thu nhập", "Cộng", "+", "Báo có", "Nhận tiền", "Tiền về".
         - **Salary Slips**: If the document contains "Lương cố định", "Tổng thu nhập", or looks like a salary table, classify as **INCOME**.
         - Even if there are expenses listed in the table, if the main subject is "Salary" (Lương), it is an INCOME transaction.
      
      2. **EXPENSE Detection**:
         - Keywords: "Chi", "Thanh toán", "Trừ", "-", "Hóa đơn" (Bill), "Payment", "Purchase".
         - Only classify as Expense if it is a payment receipt or deduction notification.

      CRITICAL LOGIC FOR "CATEGORY":
      - If Type is INCOME and text contains "Lương" or "Salary" -> Category MUST be "Salary".
      - If "Ăn uống", "Cafe", "Nhà hàng" -> "Food & Dining".
      - If "Grab", "Be", "Xăng", "Gửi xe" -> "Transportation".
      
      General Rules:
      1. If the date is missing, use today's date (YYYY-MM-DD).
      2. Amount must be a positive number (Absolute value).
      3. Return pure JSON only matching the schema.
    `;

    const parts = [];

    if (ocrText && ocrText.trim().length > 0) {
      parts.push({ text: `OCR Text Data:\n${ocrText}` });
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

    if (imageUrl) {
        parts.push({ text: `Reference Image URL: ${imageUrl}` });
    }
    
    parts.push({ text: "Extract transaction details from the above data." });

    if (parts.length <= 1) { 
      return res.status(400).json({ error: "No valid text or image provided to analyze." });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "Transaction amount" },
            type: { type: Type.STRING, enum: ["INCOME", "EXPENSE"] },
            category: { 
              type: Type.STRING, 
              enum: [
                "Food & Dining", "Transportation", "Utilities", "Shopping", 
                "Salary", "Transfer", "Entertainment", "Health & Fitness", "Other"
              ]
            },
            description: { type: Type.STRING, description: "Short description" },
            date: { type: Type.STRING, description: "ISO 8601 YYYY-MM-DD" }
          },
          required: ["amount", "type", "category", "description", "date"],
        },
      }
    });

    const result = response.text;
    if (!result) throw new Error("No content returned from AI");

    res.status(200).json(JSON.parse(result));

  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    // Return the specific error message to frontend so we can trigger fallback
    res.status(500).json({ error: "AI Processing Failed: " + error.message });
  }
}