import { neon } from '@neondatabase/serverless';
import nodemailer from 'nodemailer';

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

    // 2. Setup Security (First time or Update)
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

    // 4. Request OTP (Real Email or Simulation)
    if (action === 'request_otp') {
        // Generate a 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to Database (Server-side verification)
        await sql`
            UPDATE investment_security 
            SET otp_code = ${otpCode} 
            WHERE user_id = ${userId}
        `;

        // Get user's email
        const userRows = await sql`SELECT email FROM investment_security WHERE user_id = ${userId}`;
        const userEmail = userRows[0]?.email;

        if (!userEmail) {
             return res.status(400).json({ error: "No email configured for this user." });
        }

        // --- EMAIL SENDING LOGIC ---
        // Check if environment variables are set for sending real email
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS
                    }
                });

                await transporter.sendMail({
                    from: `"Finance Manager" <${process.env.EMAIL_USER}>`,
                    to: userEmail,
                    subject: 'Mã xác thực OTP - Đầu tư',
                    text: `Mã xác thực (OTP) của bạn là: ${otpCode}. Mã này có hiệu lực để truy cập danh mục đầu tư.`,
                    html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                            <h2 style="color: #4f46e5;">Mã xác thực bảo mật</h2>
                            <p>Xin chào,</p>
                            <p>Bạn vừa yêu cầu truy cập vào danh mục đầu tư. Đây là mã OTP của bạn:</p>
                            <h1 style="background: #f3f4f6; padding: 10px 20px; display: inline-block; border-radius: 8px; letter-spacing: 5px;">${otpCode}</h1>
                            <p>Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
                           </div>`
                });

                return res.status(200).json({ success: true, message: "OTP sent to your email!" });

            } catch (emailError) {
                console.error("Email send failed:", emailError);
                // Fallback to simulation if email fails
                return res.status(200).json({ 
                    success: true, 
                    demoOtpCode: otpCode, 
                    message: "Email failed. Showing OTP for simulation." 
                });
            }
        } else {
            // --- SIMULATION MODE (No Env Vars) ---
            return res.status(200).json({ 
                success: true, 
                demoOtpCode: otpCode, 
                message: "Simulation Mode: OTP shown because EMAIL_USER/PASS are missing in env." 
            });
        }
    }

    // 5. Verify OTP
    if (action === 'verify_otp') {
        const rows = await sql`SELECT otp_code FROM investment_security WHERE user_id = ${userId}`;
        if (rows.length === 0) return res.status(400).json({ error: "User not found" });

        const dbOtp = rows[0].otp_code;
        
        if (dbOtp && dbOtp === otp) {
            // Clear OTP after successful use
            await sql`UPDATE investment_security SET otp_code = NULL WHERE user_id = ${userId}`;
            return res.status(200).json({ success: true });
        } else {
            return res.status(401).json({ error: "Invalid OTP code" });
        }
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (error) {
    console.error("Security API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}