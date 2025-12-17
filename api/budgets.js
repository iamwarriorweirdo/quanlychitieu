import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "Missing DATABASE_URL" });
    }

    const sql = neon(process.env.DATABASE_URL);
    const { userId, id } = req.query;

    if (req.method === 'GET') {
      if (!userId) return res.status(400).json({ error: "Missing userId" });
      const rows = await sql`SELECT * FROM budgets WHERE user_id = ${userId}`;
      const budgets = rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        category: row.category,
        amount: Number(row.amount),
        period: row.period
      }));
      return res.status(200).json(budgets);
    }

    if (req.method === 'POST') {
      const { budget } = req.body;
      await sql`
        INSERT INTO budgets (id, user_id, category, amount, period)
        VALUES (${budget.id}, ${budget.userId}, ${budget.category}, ${budget.amount}, ${budget.period})
        ON CONFLICT (id) DO UPDATE SET
          amount = EXCLUDED.amount,
          period = EXCLUDED.period
      `;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM budgets WHERE id = ${id} AND user_id = ${userId}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}