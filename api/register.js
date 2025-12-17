import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Set CORS headers just in case (though usually handled by Vercel for same-origin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // Kiểm tra biến môi trường
    if (!process.env.DATABASE_URL) {
      console.error("Missing DATABASE_URL");
      return res.status(500).json({ error: "Configuration Error: DATABASE_URL is missing in environment variables." });
    }

    const sql = neon(process.env.DATABASE_URL);
    
    const body = req.body || {};
    const { id, username, password, email, phone } = body;

    if (!id || !username || !password) {
      return res.status(400).json({ error: "Missing required fields (id, username, password)" });
    }

    // Đảm bảo bảng tồn tại trước khi insert (Optional check here as init usually handles it)
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT,
          phone TEXT
        );
      `;
    } catch (dbInitError) {
      console.error("DB Init Error:", dbInitError);
    }

    // Kiểm tra trùng lặp username
    try {
      const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
      if (existing.length > 0) {
        return res.status(400).json({ error: "Username already exists / Tài khoản đã tồn tại" });
      }
      
      // Insert with email and phone
      await sql`
        INSERT INTO users (id, username, password, email, phone)
        VALUES (${id}, ${username}, ${password}, ${email || null}, ${phone || null})
      `;
      
      return res.status(200).json({ id, username, email, phone });
    } catch (sqlError) {
      console.error("SQL Error:", sqlError);
      return res.status(500).json({ error: "Database Error: " + sqlError.message });
    }

  } catch (error) {
    console.error("Register Handler Fatal Crash:", error);
    return res.status(500).json({ error: "Server Error: " + error.message });
  }
}