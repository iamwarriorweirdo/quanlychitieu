import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const sql = neon(process.env.DATABASE_URL);
  const { id, username, password } = req.body;

  try {
    const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing.length > 0) {
      return res.status(400).json({ error: "Tài khoản đã tồn tại" });
    }
    
    await sql`
      INSERT INTO users (id, username, password)
      VALUES (${id}, ${username}, ${password})
    `;
    res.status(200).json({ id, username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}