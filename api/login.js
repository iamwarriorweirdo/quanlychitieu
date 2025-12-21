
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "Missing DATABASE_URL" });
    }

    const sql = neon(process.env.DATABASE_URL);
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "Vui lòng nhập tài khoản và mật khẩu." });
    }

    const users = await sql`
      SELECT id, username, password, email, phone, role 
      FROM users 
      WHERE username = ${username} 
         OR email = ${username} 
         OR phone = ${username}
      LIMIT 1
    `;

    if (users.length > 0) {
      const user = users[0];
      if (user.password === password) {
        let currentRole = user.role;
        // Kiểm tra quyền admin nếu dùng email/tài khoản này
        if (user.email?.toLowerCase() === 'tdt19092004@gmail.com' && currentRole !== 'admin') {
           await sql`UPDATE users SET role = 'admin' WHERE id = ${user.id}`;
           currentRole = 'admin';
        }

        return res.status(200).json({ 
          id: user.id, 
          username: user.username,
          email: user.email,
          phone: user.phone,
          role: currentRole
        });
      }
    }
    
    return res.status(401).json({ error: "Thông tin đăng nhập không chính xác." });

  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: "Lỗi hệ thống: " + error.message });
  }
}
