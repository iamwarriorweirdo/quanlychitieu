import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  try {
    if (!process.env.DATABASE_URL) return res.status(500).json({ error: "Missing DATABASE_URL" });
    const sql = neon(process.env.DATABASE_URL);
    
    // Action types: 'check_status', 'setup', 'verify_password', 'request_otp', 'verify_otp'
    const { action, userId, password, email, otp } = req.body;

    // 1. Check if user has security setup
    if (action === 'check_status') {
      const rows = await sql`SELECT is_otp_enabled, email FROM investment_security WHERE user_id = ${userId}`;
      if (rows.length === 0) return res.status(200).json({ hasPassword: false, isOtpEnabled: false });
      return res.status(200).json({ hasPassword: true, isOtpEnabled: rows[0].is_otp_enabled, email: rows[0].email });
    }

    // 2. Setup Security (First time)
    if (action === 'setup') {
        const isOtp = !!email;
        await sql`
            INSERT INTO investment_security (user_id, secondary_password, is_otp_enabled, email)
            VALUES (${userId}, ${password}, ${isOtp}, ${email})
            ON CONFLICT (user_id) DO UPDATE SET
            secondary_password = ${password},
            is_otp_enabled = ${isOtp},
            email = ${email}
        `;
        return res.status(200).json({ success: true });
    }

    // 3. Verify Password
    if (action === 'verify_password') {
        const rows = await sql`SELECT secondary_password FROM investment_security WHERE user_id = ${userId}`;
        if (rows.length === 0) return res.status(400).json({ error: "No security set" });
        
        if (rows[0].secondary_password === password) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(401).json({ error: "Wrong password" });
        }
    }

    // 4. Request OTP (SIMULATION)
    if (action === 'request_otp') {
        // In a real app, send email here.
        // For demo, we return the code to the client or log it.
        const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
        // We are sending it back in response for DEMO purposes so the user can see it
        return res.status(200).json({ success: true, demoOtpCode: mockOtp, message: "OTP sent to email (Check Console/Alert)" });
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}