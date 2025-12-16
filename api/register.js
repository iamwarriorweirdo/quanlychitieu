import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // Kiểm tra biến môi trường
    if (!process.env.DATABASE_URL) {
      console.error("Missing DATABASE_URL");
      return res.status(500).json({ error: "Missing DATABASE_URL. Please configure it in Vercel." });
    }

    const sql = neon(process.env.DATABASE_URL);
    
    // Safely access body
    const body = req.body || {};
    const { id, username, password } = body;

    if (!id || !username || !password) {
      return res.status(400).json({ error: "Missing required fields (id, username, password)" });
    }

    // Đảm bảo bảng tồn tại trước khi insert
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL
        );
      `;
    } catch (dbInitError) {
      console.error("DB Init Error:", dbInitError);
      // Tiếp tục thử insert, có thể bảng đã tồn tại hoặc lỗi kết nối sẽ được bắt ở dưới
    }

    // Kiểm tra trùng lặp
    try {
      const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
      if (existing.length > 0) {
        return res.status(400).json({ error: "Username already exists / Tài khoản đã tồn tại" });
      }
      
      await sql`
        INSERT INTO users (id, username, password)
        VALUES (${id}, ${username}, ${password})
      `;
      
      return res.status(200).json({ id, username });
    } catch (sqlError) {
      console.error("SQL Error:", sqlError);
      return res.status(500).json({ error: "Database operation failed: " + sqlError.message });
    }

  } catch (error) {
    console.error("Register Handler Crash:", error);
    return res.status(500).json({ error: "Internal Server Error: " + error.message });
  }
}