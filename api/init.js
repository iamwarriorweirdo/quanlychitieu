import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Missing DATABASE_URL" });
  }

  const sql = neon(process.env.DATABASE_URL);

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

    // Migration: Add email and phone columns if they don't exist (for existing databases)
    try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`;
    } catch (e) {
        console.log("Migration note: users column check skipped", e.message);
    }

    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        amount NUMERIC NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at BIGINT NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        name TEXT NOT NULL,
        target_amount NUMERIC NOT NULL,
        current_amount NUMERIC NOT NULL DEFAULT 0,
        deadline TEXT,
        icon TEXT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        category TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        period TEXT DEFAULT 'monthly'
      );
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS investments (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity NUMERIC NOT NULL,
        unit TEXT, 
        buy_price NUMERIC NOT NULL,
        current_price NUMERIC NOT NULL,
        date TEXT NOT NULL
      );
    `;
    
    try {
      await sql`ALTER TABLE investments ADD COLUMN IF NOT EXISTS unit TEXT`;
    } catch (e) {
      console.log("Migration note: unit column check skipped", e.message);
    }

    await sql`
      CREATE TABLE IF NOT EXISTS investment_security (
        user_id TEXT PRIMARY KEY REFERENCES users(id),
        secondary_password TEXT NOT NULL,
        is_otp_enabled BOOLEAN DEFAULT FALSE,
        email TEXT,
        otp_code TEXT
      );
    `;
    
    try {
      await sql`ALTER TABLE investment_security ADD COLUMN IF NOT EXISTS otp_code TEXT`;
    } catch (e) {
      console.log("Migration note: otp_code column check skipped", e.message);
    }

    res.status(200).json({ message: "Database initialized successfully" });
  } catch (error) {
    console.error("Init Error:", error);
    res.status(500).json({ error: "Init failed: " + error.message });
  }
}