import { neon } from '@neondatabase/serverless';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  try {
    if (!process.env.DATABASE_URL) return res.status(500).json({ error: "Missing DATABASE_URL" });
    const sql = neon(process.env.DATABASE_URL);
    
    // Action types: 'check_status', 'setup', 'verify_password', 'request_otp', 'verify_otp'
    const { action, userId, password, email, otp, targetEmail } = req.body;

    // 1. Check if user has security setup
    if (action === 'check_status') {
      const rows = await sql`SELECT is_otp_enabled, email FROM investment_security WHERE user_id = ${userId}`;
      if (rows.length === 0) return res.status(200).json({ hasPassword: false, isOtpEnabled: false });
      return res.status(200).json({ hasPassword: true, isOtpEnabled: rows[0].is_otp_enabled, email: rows[0].email });
    }

    // 2. Setup Security (Save Password or Save Email after Verification)
    if (action === 'setup') {
        const isOtp = !!email;
        
        const existing = await sql`SELECT user_id FROM investment_security WHERE user_id = ${userId}`;
        
        if (existing.length === 0) {
             await sql`
                INSERT INTO investment_security (user_id, secondary_password, is_otp_enabled, email)
                VALUES (${userId}, ${password}, ${isOtp}, ${email})
            `;
        } else {
             if (email) {
                 await sql`
                    UPDATE investment_security 
                    SET email = ${email}, is_otp_enabled = ${true}
                    WHERE user_id = ${userId}
                 `;
             }
             if (password) {
                 await sql`
                    UPDATE investment_security 
                    SET secondary_password = ${password}
                    WHERE user_id = ${userId}
                 `;
             }
        }
        
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

    // 4. Request OTP
    if (action === 'request_otp') {
        // Enforce Email Configuration for Security
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
             console.error("Security Error: EMAIL_USER or EMAIL_PASS not set.");
             return res.status(503).json({ error: "Hệ thống gửi Email chưa được cấu hình. Vui lòng liên hệ quản trị viên." });
        }

        // Generate a 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to Database
        const updateResult = await sql`
            UPDATE investment_security 
            SET otp_code = ${otpCode} 
            WHERE user_id = ${userId}
            RETURNING user_id
        `;
        
        if (updateResult.length === 0) {
             return res.status(400).json({ error: "Please set up a security password first." });
        }

        // Determine email recipient
        let emailToSend = targetEmail; 
        if (!emailToSend) {
            const userRows = await sql`SELECT email FROM investment_security WHERE user_id = ${userId}`;
            emailToSend = userRows[0]?.email;
        }

        if (!emailToSend) {
             return res.status(400).json({ error: "No email address found." });
        }

        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            await transporter.sendMail({
                from: `"Finance Security" <${process.env.EMAIL_USER}>`,
                to: emailToSend,
                subject: 'Mã xác thực OTP - Finance Manager',
                text: `Mã xác thực (OTP) của bạn là: ${otpCode}. Mã này có hiệu lực trong 5 phút.`,
                html: `
                  <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; max-width: 500px; margin: 0 auto;">
                    <h2 style="color: #4f46e5; text-align: center;">Mã Xác Thực Bảo Mật</h2>
                    <p>Xin chào,</p>
                    <p>Hệ thống vừa nhận được yêu cầu truy cập bảo mật. Đây là mã OTP của bạn:</p>
                    <div style="text-align: center; margin: 20px 0;">
                      <span style="background: #f3f4f6; padding: 15px 30px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333;">${otpCode}</span>
                    </div>
                    <p style="color: #666; font-size: 13px;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
                  </div>
                `
            });

            // Security: DO NOT return the OTP code in the response
            return res.status(200).json({ success: true, message: "OTP sent successfully" });

        } catch (emailError) {
            console.error("Email send failed:", emailError);
            return res.status(500).json({ error: "Gửi Email thất bại. Vui lòng kiểm tra lại địa chỉ email." });
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
            return res.status(401).json({ error: "Mã OTP không chính xác" });
        }
    }

    return res.status(400).json({ error: "Invalid action" });

  } catch (error) {
    console.error("Security API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}