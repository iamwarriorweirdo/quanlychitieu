
import { neon } from '@neondatabase/serverless';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  try {
    if (!process.env.DATABASE_URL) return res.status(500).json({ error: "Missing DATABASE_URL" });
    const sql = neon(process.env.DATABASE_URL);
    
    const { action, userId, password, email, otp, targetEmail, smtpEmail, smtpPassword } = req.body;

    // 1. Check status
    if (action === 'check_status') {
      const rows = await sql`SELECT is_otp_enabled, email, smtp_email FROM investment_security WHERE user_id = ${userId}`;
      const userRows = await sql`SELECT email FROM users WHERE id = ${userId}`;
      
      const linkedEmail = rows.length > 0 ? rows[0].email : null;
      const accountEmail = userRows.length > 0 ? userRows[0].email : null;
      
      return res.status(200).json({ 
          hasPassword: rows.length > 0, 
          isOtpEnabled: rows.length > 0 ? (rows[0].is_otp_enabled || !!rows[0].email) : false, 
          email: linkedEmail || accountEmail,
          hasSmtp: rows.length > 0 ? !!rows[0].smtp_email : false
      });
    }

    // 2. Setup Security & SYNC Email to Users Table
    if (action === 'setup') {
        const isOtp = !!email;
        const existing = await sql`SELECT user_id FROM investment_security WHERE user_id = ${userId}`;
        
        if (existing.length === 0) {
             await sql`
                INSERT INTO investment_security (user_id, secondary_password, is_otp_enabled, email)
                VALUES (${userId}, ${password || 'default123'}, ${isOtp}, ${email || null})
            `;
        } else {
             if (email) {
                 await sql`
                    UPDATE investment_security 
                    SET email = ${email}, is_otp_enabled = TRUE
                    WHERE user_id = ${userId}
                 `;
                 // CRITICAL: SYNC TO USERS TABLE for Login capability
                 await sql`
                    UPDATE users 
                    SET email = ${email}
                    WHERE id = ${userId}
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

    // 3. Request OTP
    if (action === 'request_otp') {
        // Find recipient email
        let emailToSend = targetEmail; 
        if (!emailToSend) {
            const secRows = await sql`SELECT email FROM investment_security WHERE user_id = ${userId}`;
            if (secRows.length > 0 && secRows[0].email) {
                emailToSend = secRows[0].email;
            } else {
                const userRows = await sql`SELECT email FROM users WHERE id = ${userId}`;
                if (userRows.length > 0) emailToSend = userRows[0].email;
            }
        }

        if (!emailToSend) return res.status(400).json({ error: "Không tìm thấy Email để gửi OTP. Vui lòng liên kết Gmail trước." });

        // Sender Config (System or Custom)
        let senderUser = process.env.EMAIL_USER;
        let senderPass = process.env.EMAIL_PASS;
        
        const userConf = await sql`SELECT smtp_email, smtp_password FROM investment_security WHERE user_id = ${userId}`;
        if (userConf.length > 0 && userConf[0].smtp_email && userConf[0].smtp_password) {
            senderUser = userConf[0].smtp_email;
            senderPass = userConf[0].smtp_password;
        }

        if (!senderUser || !senderPass) {
             return res.status(503).json({ 
               error: "Hệ thống chưa được cấu hình Email gửi. Vui lòng thiết lập 'Email Gửi' trong cài đặt bảo mật." 
             });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        await sql`UPDATE investment_security SET otp_code = ${otpCode} WHERE user_id = ${userId}`;

        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: senderUser, pass: senderPass }
            });

            await transporter.sendMail({
                from: `"Finance Security" <${senderUser}>`,
                to: emailToSend,
                subject: 'Mã OTP Xác Thực - Finance Manager',
                html: `<div style="padding:20px;border:1px solid #ddd;border-radius:10px;font-family:sans-serif;max-width:400px;margin:auto;">
                        <h2 style="color:#4f46e5;text-align:center;">Mã OTP</h2>
                        <div style="text-align:center;font-size:32px;font-weight:bold;letter-spacing:10px;background:#f3f4f6;padding:15px;border-radius:8px;">${otpCode}</div>
                        <p style="font-size:12px;color:#666;text-align:center;margin-top:20px;">Mã có hiệu lực trong 5 phút. Nếu không phải bạn yêu cầu, vui lòng đổi mật khẩu.</p>
                       </div>`
            });
            return res.status(200).json({ success: true });
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Lỗi gửi Email. Hãy đảm bảo bạn đã dùng 'Mật khẩu ứng dụng' Gmail thay vì mật khẩu thông thường." });
        }
    }

    // 4. Verify OTP
    if (action === 'verify_otp') {
        const rows = await sql`SELECT otp_code FROM investment_security WHERE user_id = ${userId}`;
        if (rows.length > 0 && rows[0].otp_code === otp) {
            await sql`UPDATE investment_security SET otp_code = NULL WHERE user_id = ${userId}`;
            return res.status(200).json({ success: true });
        }
        return res.status(401).json({ error: "Mã OTP không chính xác" });
    }

    // 5. Verify Password
    if (action === 'verify_password') {
        const rows = await sql`SELECT secondary_password FROM investment_security WHERE user_id = ${userId}`;
        if (rows.length > 0 && rows[0].secondary_password === password) return res.status(200).json({ success: true });
        return res.status(401).json({ error: "Mật khẩu cấp 2 không chính xác" });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
