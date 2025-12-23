
import { OAuth2Client } from 'google-auth-library';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const SERVER_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.trim() : null;
  
  if (!SERVER_CLIENT_ID) {
    return res.status(500).json({ error: "Lỗi Server: Chưa cấu hình GOOGLE_CLIENT_ID." });
  }

  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: "Thiếu mã xác thực (credential)." });

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Missing DATABASE_URL" });
  }

  const sql = neon(process.env.DATABASE_URL);
  const client = new OAuth2Client(SERVER_CLIENT_ID);

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: SERVER_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new Error("Dữ liệu xác thực trống.");

    const { sub: googleId, email, name, picture } = payload;
    
    // Kiểm tra email Superadmin (Không phân biệt hoa thường)
    const isSuperAdminEmail = email?.toLowerCase() === 'tdt19092004@gmail.com';

    let users = await sql`SELECT * FROM users WHERE google_id = ${googleId} OR email = ${email} LIMIT 1`;
    let user;

    if (users.length === 0) {
      const newId = crypto.randomUUID();
      const role = isSuperAdminEmail ? 'superadmin' : 'user';
      
      await sql`
        INSERT INTO users (id, username, email, role, google_id, avatar, password)
        VALUES (${newId}, ${name}, ${email}, ${role}, ${googleId}, ${picture}, ${crypto.randomUUID()})
      `;
      user = { id: newId, username: name, email, role: role, avatar: picture, googleId };
    } else {
      user = users[0];
      
      // Luôn cập nhật lên Superadmin nếu email khớp
      if (isSuperAdminEmail) {
        await sql`UPDATE users SET role = 'superadmin' WHERE id = ${user.id}`;
        user.role = 'superadmin';
      }

      await sql`UPDATE users SET google_id = ${googleId}, avatar = ${picture} WHERE id = ${user.id}`;
      user = { ...user, avatar: picture, googleId, role: user.role };
    }

    return res.status(200).json(user);

  } catch (error) {
    console.error("GOOGLE AUTH ERROR:", error);
    return res.status(401).json({ error: "Lỗi xác thực: " + error.message });
  }
}
