import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);
  const { userId, id } = req.query;

  // GET: Lấy danh sách
  if (req.method === 'GET') {
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    try {
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
      res.status(200).json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Fetch error" });
    }
    return;
  }

  // POST: Tạo mới
  if (req.method === 'POST') {
    const { userId: bodyUserId, transaction } = req.body;
    try {
      await sql`
        INSERT INTO transactions (id, user_id, amount, type, category, description, date, created_at)
        VALUES (${transaction.id}, ${bodyUserId}, ${transaction.amount}, ${transaction.type}, ${transaction.category}, ${transaction.description}, ${transaction.date}, ${transaction.createdAt})
      `;
      res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Save error" });
    }
    return;
  }

  // DELETE: Xóa (Dùng query param id)
  if (req.method === 'DELETE') {
    if (!id || !userId) return res.status(400).json({ error: "Missing id or userId" });
    try {
      await sql`
        DELETE FROM transactions 
        WHERE id = ${id} AND user_id = ${userId}
      `;
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Delete error" });
    }
    return;
  }

  res.status(405).send('Method Not Allowed');
}