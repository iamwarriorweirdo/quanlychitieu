
import { OAuth2Client } from 'google-auth-library';
import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Lấy Client ID từ biến môi trường của Server
  const SERVER_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.trim() : null;
  
  if (!SERVER_CLIENT_ID) {
    console.error("SERVER ERROR: Variable GOOGLE_CLIENT_ID is not set on the server.");
    return res.status(500).json({ error: "Hệ thống chưa cấu hình GOOGLE_CLIENT_ID ở Server." });
  }

  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: "Missing credential token." });

  const sql = neon(process.env.DATABASE_URL);
  const client = new OAuth2Client(SERVER_CLIENT_ID);

  try {
    // Xác thực token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: SERVER_CLIENT_ID, // Token từ Frontend gửi lên phải khớp với ID ở Server
    });
    const payload = ticket.getPayload();
    if (!payload) throw new Error("Payload trống.");

    const { sub: googleId, email, name, picture } = payload;

    // Tìm hoặc tạo người dùng
    let users = await sql`SELECT * FROM users WHERE google_id = ${googleId} OR email = ${email} LIMIT 1`;
    let user;

    if (users.length === 0) {
      const newId = crypto.randomUUID();
      await sql`
        INSERT INTO users (id, username, email, role, google_id, avatar, password)
        VALUES (${newId}, ${name}, ${email}, 'user', ${googleId}, ${picture}, ${crypto.randomUUID()})
      `;
      user = { id: newId, username: name, email, role: 'user', avatar: picture, googleId };
    } else {
      user = users[0];
      if (!user.google_id || user.avatar !== picture) {
        await sql`UPDATE users SET google_id = ${googleId}, avatar = ${picture} WHERE id = ${user.id}`;
      }
      user = { ...user, avatar: picture, googleId };
    }

    return res.status(200).json(user);

  } catch (error) {
    console.error("GOOGLE AUTH VERIFICATION FAILED:", error.message);
    console.error("Used Client ID at Server:", SERVER_CLIENT_ID);
    return res.status(401).json({ error: "Xác thực Google thất bại. Hãy kiểm tra Client ID ở cả Frontend và Backend." });
  }
}
