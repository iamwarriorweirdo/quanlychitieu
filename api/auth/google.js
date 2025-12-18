
import { OAuth2Client } from 'google-auth-library';
import { neon } from '@neondatabase/serverless';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { credential } = req.body;
  if (!credential) return res.status(400).json({ error: "Missing credential" });

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "Missing DATABASE_URL" });
  }

  const sql = neon(process.env.DATABASE_URL);
  const client = new OAuth2Client(CLIENT_ID);

  try {
    // Verify Google ID Token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new Error("Invalid payload");

    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists by googleId or email
    let users = await sql`
      SELECT id, username, email, role, avatar, google_id 
      FROM users 
      WHERE google_id = ${googleId} OR email = ${email}
      LIMIT 1
    `;

    let user;
    if (users.length === 0) {
      // Create new user
      const newUserId = crypto.randomUUID();
      await sql`
        INSERT INTO users (id, username, email, role, google_id, avatar, password)
        VALUES (${newUserId}, ${name}, ${email}, 'user', ${googleId}, ${picture}, ${crypto.randomUUID()})
      `;
      user = { id: newUserId, username: name, email, role: 'user', avatar: picture, googleId };
    } else {
      user = users[0];
      // Update google_id and avatar if needed
      if (!user.google_id || user.avatar !== picture) {
        await sql`
          UPDATE users 
          SET google_id = ${googleId}, avatar = ${picture}
          WHERE id = ${user.id}
        `;
      }
      user = { ...user, avatar: picture, googleId }; // Use latest picture
    }

    return res.status(200).json(user);

  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(401).json({ error: "Google verification failed: " + error.message });
  }
}