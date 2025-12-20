
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    if (!process.env.DATABASE_URL) {
      console.error("Missing DATABASE_URL");
      return res.status(500).json({ error: "Configuration Error: DATABASE_URL is missing." });
    }

    const sql = neon(process.env.DATABASE_URL);
    
    const body = req.body || {};
    const { id, username, password, email, phone } = body;

    if (!id || !username || !password) {
      return res.status(400).json({ error: "Missing required fields (id, username, password)" });
    }

    const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }
    
    await sql`
      INSERT INTO users (id, username, password, email, phone)
      VALUES (${id}, ${username}, ${password}, ${email || null}, ${phone || null})
    `;
    
    return res.status(200).json({ id, username, email, phone });

  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ error: "Server Error: " + error.message });
  }
}
