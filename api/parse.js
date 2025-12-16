import Groq from "groq-sdk";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const { content, isImage } = req.body;

  try {
    let messages = [];

    const systemPrompt = `
      You are a smart financial assistant. Task: Extract transaction details from bank SMS or receipt images.
      
      Output JSON format required (return JSON only, no markdown):
      {
        "amount": number (positive integer),
        "type": "INCOME" | "EXPENSE",
        "category": string (One of: "Food & Dining", "Transportation", "Utilities", "Shopping", "Salary", "Transfer", "Entertainment", "Health & Fitness", "Other"),
        "description": string (Short description in English),
        "date": string (ISO 8601 YYYY-MM-DD, use today if not found)
      }
    `;

    if (isImage) {
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: systemPrompt + " Analyze this image." },
            { type: "image_url", image_url: { url: content } }
          ]
        }
      ];
    } else {
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