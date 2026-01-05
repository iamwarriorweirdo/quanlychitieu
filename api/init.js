
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Missing DATABASE_URL" });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // 1. Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT DEFAULT 'user',
        google_id TEXT,
        avatar TEXT
      );
    `;

    // 2. Add Indexes for optimization (Neon recommendation)
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;

    try {
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT`;
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`;
    } catch (e) {
        console.log("Migration note: users column check skipped", e.message);
    }

    // 3. Seed Admin User (Manual)
    const adminExists = await sql`SELECT id FROM users WHERE username = 'Admin'`;
    if (adminExists.length === 0) {
        await sql`
            INSERT INTO users (id, username, password, role)
            VALUES (${crypto.randomUUID()}, 'Admin', 'Thuanthanh333@', 'admin')
        `;
    }

    // Superadmin update
    await sql`
      UPDATE users 
      SET role = 'superadmin' 
      WHERE email = 'tdt19092004@gmail.com'
    `;

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
    // Optimization: Index on user_id and created_at for fast history retrieval
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC)`;

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
    await sql`CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        category TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        period TEXT DEFAULT 'monthly'
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id)`;
    
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
    await sql`CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id)`;
    
    await sql`
      CREATE TABLE IF NOT EXISTS investment_security (
        user_id TEXT PRIMARY KEY REFERENCES users(id),
        secondary_password TEXT NOT NULL,
        is_otp_enabled BOOLEAN DEFAULT FALSE,
        email TEXT,
        otp_code TEXT,
        smtp_email TEXT,
        smtp_password TEXT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `;
    const aiEnabled = await sql`SELECT value FROM app_settings WHERE key = 'ai_enabled'`;
    if (aiEnabled.length === 0) {
        await sql`INSERT INTO app_settings (key, value) VALUES ('ai_enabled', 'true'), ('maintenance_mode', 'false')`;
    }

    res.status(200).json({ message: "Database optimized with indexes and initialized." });
  } catch (error) {
    console.error("Init Error:", error);
    res.status(500).json({ error: "Init failed: " + error.message });
  }
}
