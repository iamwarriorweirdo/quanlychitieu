
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  try {
    if (!process.env.DATABASE_URL) return res.status(500).json({ error: "Missing DATABASE_URL" });
    const sql = neon(process.env.DATABASE_URL);
    const { userId, id } = req.query;

    if (req.method === 'GET') {
      if (!userId) return res.status(400).json({ error: "Missing userId" });
      const rows = await sql`
        SELECT id, user_id, symbol, name, type, quantity, unit, buy_price, current_price, date 
        FROM investments 
        WHERE user_id = ${userId}
      `;
      const investments = rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        symbol: row.symbol,
        name: row.name,
        type: row.type,
        quantity: Number(row.quantity),
        unit: row.unit,
        buyPrice: Number(row.buy_price),
        currentPrice: Number(row.current_price),
        date: row.date
      }));
      return res.status(200).json(investments);
    }

    if (req.method === 'POST') {
      const { investment } = req.body;
      await sql`
        INSERT INTO investments (id, user_id, symbol, name, type, quantity, unit, buy_price, current_price, date)
        VALUES (${investment.id}, ${investment.userId}, ${investment.symbol}, ${investment.name}, ${investment.type}, ${investment.quantity}, ${investment.unit}, ${investment.buyPrice}, ${investment.currentPrice}, ${investment.date})
        ON CONFLICT (id) DO UPDATE SET
          symbol = EXCLUDED.symbol,
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          quantity = EXCLUDED.quantity,
          unit = EXCLUDED.unit,
          buy_price = EXCLUDED.buy_price,
          current_price = EXCLUDED.current_price,
          date = EXCLUDED.date
      `;
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM investments WHERE id = ${id} AND user_id = ${userId}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
