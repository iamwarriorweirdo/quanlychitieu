
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: "Missing DATABASE_URL" });
  const sql = neon(process.env.DATABASE_URL);

  const { adminId, action, key, value, targetUserId, newRole } = req.body || req.query;

  // Verify Admin/Superadmin Permission
  const adminCheck = await sql`SELECT role FROM users WHERE id = ${adminId || req.query.adminId}`;
  if (adminCheck.length === 0 || (adminCheck[0].role !== 'admin' && adminCheck[0].role !== 'superadmin')) {
    return res.status(403).json({ error: "Unauthorized access" });
  }

  const isSuperAdmin = adminCheck[0].role === 'superadmin';

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
        settings: settings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}),
        currentUserRole: adminCheck[0].role
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

    // 3. Update User Role (Superadmin Only)
    if (req.method === 'POST' && action === 'update_user_role') {
      if (!isSuperAdmin) return res.status(403).json({ error: "Only Superadmin can change roles" });
      if (!targetUserId || !newRole) return res.status(400).json({ error: "Missing parameters" });
      
      // Prevent demoting self
      if (targetUserId === adminId) return res.status(400).json({ error: "Cannot change your own role" });

      await sql`UPDATE users SET role = ${newRole} WHERE id = ${targetUserId}`;
      return res.status(200).json({ success: true });
    }

    // 4. Delete User
    if (req.method === 'DELETE') {
        const { targetUserId: delTarget } = req.query;
        if (delTarget === adminId) return res.status(400).json({ error: "Cannot delete self" });
        
        // Admins cannot delete other Admins or Superadmins
        const targetCheck = await sql`SELECT role FROM users WHERE id = ${delTarget}`;
        if (targetCheck.length > 0) {
            if (!isSuperAdmin && (targetCheck[0].role === 'admin' || targetCheck[0].role === 'superadmin')) {
                return res.status(403).json({ error: "Admin cannot delete other Admins" });
            }
        }

        await sql`DELETE FROM transactions WHERE user_id = ${delTarget}`;
        await sql`DELETE FROM investments WHERE user_id = ${delTarget}`;
        await sql`DELETE FROM goals WHERE user_id = ${delTarget}`;
        await sql`DELETE FROM budgets WHERE user_id = ${delTarget}`;
        await sql`DELETE FROM users WHERE id = ${delTarget}`;
        
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Admin API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
