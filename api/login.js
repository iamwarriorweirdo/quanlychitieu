import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "Missing DATABASE_URL" });
    }

    const sql = neon(process.env.DATABASE_URL);
    const body = req.body || {};
    const { username, password } = body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

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
    return res.status(401).json({ error: "Invalid username or password" });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Login failed: " + error.message });
  }
}