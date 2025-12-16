import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  // Kiểm tra biến môi trường
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Missing DATABASE_URL" });
  }

  const sql = neon(process.env.DATABASE_URL);
  const { id, username, password } = req.body;

  try {
    // Đảm bảo bảng tồn tại trước khi insert (để tránh lỗi 500 nếu init chưa chạy)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `;

    // Kiểm tra trùng lặp
    const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing.length > 0) {
      return res.status(400).json({ error: "Username already exists / Tài khoản đã tồn tại" });
    }
    
    await sql`
      INSERT INTO users (id, username, password)
      VALUES (${id}, ${username}, ${password})
    `;
    res.status(200).json({ id, username });
  } catch (error) {
    console.error("Register Error:", error);
    // Trả về chi tiết lỗi để debug (trong môi trường prod nên ẩn đi)
    res.status(500).json({ error: "Database Error: " + error.message });
  }
}