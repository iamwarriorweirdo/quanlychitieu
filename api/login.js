import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const sql = neon(process.env.DATABASE_URL);
  const { username, password } = req.body;

  try {
    const users = await sql`
      SELECT id, username, password 
      FROM users 
      WHERE username = ${username}
    `;

    if (users.length > 0) {
      const user = users[0];
      if (user.password === password) {
        return res.status(200).json({ id: user.id, username: user.username });
      }
    }
    res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu" });
  } catch (error) {
    res.status(500).json({ error: "Login error" });
  }
}