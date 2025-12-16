import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "Missing DATABASE_URL" });
    }

    const sql = neon(process.env.DATABASE_URL);
    const { userId, id } = req.query;

    // GET: Lấy danh sách
    if (req.method === 'GET') {
      if (!userId) return res.status(400).json({ error: "Missing userId" });
      
      // Ensure table exists (lazy init)
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

      const rows = await sql`
        SELECT * FROM transactions 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC
      `;
      // Convert numeric fields
      const transactions = rows.map(row => ({
        ...row,
        amount: Number(row.amount),
        created_at: Number(row.created_at)
      }));
      return res.status(200).json(transactions);
    }

    // POST: Tạo mới
    if (req.method === 'POST') {
      const body = req.body || {};
      const { userId: bodyUserId, transaction } = body;
      
      if (!bodyUserId || !transaction) {
         return res.status(400).json({ error: "Invalid data" });
      }

      await sql`
        INSERT INTO transactions (id, user_id, amount, type, category, description, date, created_at)
        VALUES (${transaction.id}, ${bodyUserId}, ${transaction.amount}, ${transaction.type}, ${transaction.category}, ${transaction.description}, ${transaction.date}, ${transaction.createdAt})
      `;
      return res.status(200).json({ success: true });
    }

    // DELETE: Xóa
    if (req.method === 'DELETE') {
      if (!id || !userId) return res.status(400).json({ error: "Missing id or userId" });
      
      await sql`
        DELETE FROM transactions 
        WHERE id = ${id} AND user_id = ${userId}
      `;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (error) {
    console.error("Transaction API Error:", error);
    return res.status(500).json({ error: "Internal Error: " + error.message });
  }
}