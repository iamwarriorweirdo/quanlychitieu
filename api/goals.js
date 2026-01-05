
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
      const rows = await sql`
        SELECT id, user_id, name, target_amount, current_amount, deadline, icon 
        FROM goals 
        WHERE user_id = ${userId}
      `;
      const goals = rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        name: row.name,
        targetAmount: Number(row.target_amount),
        currentAmount: Number(row.current_amount),
        deadline: row.deadline,
        icon: row.icon
      }));
      return res.status(200).json(goals);
    }

    if (req.method === 'POST') {
      const { goal } = req.body;
      await sql`
        INSERT INTO goals (id, user_id, name, target_amount, current_amount, deadline, icon)
        VALUES (${goal.id}, ${goal.userId}, ${goal.name}, ${goal.targetAmount}, ${goal.currentAmount}, ${goal.deadline}, ${goal.icon})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          target_amount = EXCLUDED.target_amount,
          current_amount = EXCLUDED.current_amount,
          deadline = EXCLUDED.deadline,
          icon = EXCLUDED.icon
      `;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM goals WHERE id = ${id} AND user_id = ${userId}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
