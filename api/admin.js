
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: "Missing DATABASE_URL" });
  const sql = neon(process.env.DATABASE_URL);

  const { adminId, action, key, value } = req.body || req.query;

  // Verify Admin Permission
  const adminCheck = await sql`SELECT role FROM users WHERE id = ${adminId || req.query.adminId}`;
  if (adminCheck.length === 0 || adminCheck[0].role !== 'admin') {
    return res.status(403).json({ error: "Unauthorized access" });
  }

  try {
    // 1. Fetch Stats & Users
    if (req.method === 'GET') {
      const users = await sql`SELECT id, username, email, phone, role FROM users ORDER BY username ASC`;
      const txCount = await sql`SELECT COUNT(*) FROM transactions`;
      const investCount = await sql`SELECT COUNT(*) FROM investments`;
      const settings = await sql`SELECT * FROM app_settings`;

      return res.status(200).json({
        users,
        stats: {
          totalUsers: users.length,
          totalTransactions: parseInt(txCount[0].count),
          totalInvestments: parseInt(investCount[0].count),
        },
        settings: settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {})
      });
    }

    // 2. Update Settings
    if (req.method === 'POST' && action === 'update_setting') {
      await sql`
        INSERT INTO app_settings (key, value) VALUES (${key}, ${value})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `;
      return res.status(200).json({ success: true });
    }

    // 3. Delete User
    if (req.method === 'DELETE') {
        const { targetUserId } = req.query;
        if (targetUserId === adminId) return res.status(400).json({ error: "Cannot delete self" });
        
        await sql`DELETE FROM transactions WHERE user_id = ${targetUserId}`;
        await sql`DELETE FROM investments WHERE user_id = ${targetUserId}`;
        await sql`DELETE FROM goals WHERE user_id = ${targetUserId}`;
        await sql`DELETE FROM budgets WHERE user_id = ${targetUserId}`;
        await sql`DELETE FROM users WHERE id = ${targetUserId}`;
        
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Admin API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
