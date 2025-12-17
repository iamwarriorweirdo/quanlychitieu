import { neon } from '@neondatabase/serverless';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  try {
    if (!process.env.DATABASE_URL) return res.status(500).json({ error: "Missing DATABASE_URL" });
    const sql = neon(process.env.DATABASE_URL);
    
    // Action types: 'check_status', 'setup', 'setup_smtp', 'verify_password', 'request_otp', 'verify_otp'
    const { action, userId, password, email, otp, targetEmail, smtpEmail, smtpPassword } = req.body;

    // 1. Check if user has security setup
    if (action === 'check_status') {
      const rows = await sql`SELECT is_otp_enabled, email, smtp_email FROM investment_security WHERE user_id = ${userId}`;
      
      // If no explicit security row, check if user has main account email to suggest
      let mainEmail = null;
      if (rows.length === 0 || !rows[0].email) {
          const userRows = await sql`SELECT email FROM users WHERE id = ${userId}`;
          if (userRows.length > 0) mainEmail = userRows[0].email;
      }

      if (rows.length === 0) return res.status(200).json({ hasPassword: false, isOtpEnabled: false, email: mainEmail, hasSmtp: false });
      
      return res.status(200).json({ 
          hasPassword: true, 
          isOtpEnabled: rows[0].is_otp_enabled, 
          email: rows[0].email || mainEmail,
          hasSmtp: !!rows[0].smtp_email 
      });
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

    // 2b. Setup SMTP (Personal Email Sender)
    if (action === 'setup_smtp') {
        if (!smtpEmail || !smtpPassword) return res.status(400).json({ error: "Missing SMTP credentials" });
        
        // Ensure record exists
        const existing = await sql`SELECT user_id FROM investment_security WHERE user_id = ${userId}`;
        if (existing.length === 0) {
             // Create with dummy password if not exists, though usually setup flow comes first
             await sql`
                INSERT INTO investment_security (user_id, secondary_password, smtp_email, smtp_password)
                VALUES (${userId}, 'default123', ${smtpEmail}, ${smtpPassword})
            `;
        } else {
             await sql`
                UPDATE investment_security 
                SET smtp_email = ${smtpEmail}, smtp_password = ${smtpPassword}
                WHERE user_id = ${userId}
             `;
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
        
        // Determine Sender Config
        let senderUser = process.env.EMAIL_USER;
        let senderPass = process.env.EMAIL_PASS;
        
        // If Server Env is missing, check User DB Config
        if (!senderUser || !senderPass) {
             const userConf = await sql`SELECT smtp_email, smtp_password FROM investment_security WHERE user_id = ${userId}`;
             if (userConf.length > 0 && userConf[0].smtp_email && userConf[0].smtp_password) {
                 senderUser = userConf[0].smtp_email;
                 senderPass = userConf[0].smtp_password;
             }
        }

        if (!senderUser || !senderPass) {
             return res.status(503).json({ 
               error: "Hệ thống gửi Email chưa được cấu hình. Bạn cần cấu hình 'Email Gửi' trong phần Cài đặt Bảo mật hoặc liên hệ Admin." 
             });
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
        
        // If no specific target (e.g. login flow), get from DB
        if (!emailToSend) {
            const secRows = await sql`SELECT email FROM investment_security WHERE user_id = ${userId}`;
            if (secRows.length > 0 && secRows[0].email) {
                emailToSend = secRows[0].email;
            } else {
                const userRows = await sql`SELECT email FROM users WHERE id = ${userId}`;
                if (userRows.length > 0) emailToSend = userRows[0].email;
            }
        }

        if (!emailToSend) {
             return res.status(400).json({ error: "Không tìm thấy địa chỉ email nhận. Vui lòng liên kết email trước." });
        }

        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: senderUser,
                    pass: senderPass
                }
            });

            await transporter.sendMail({
                from: `"Finance Security" <${senderUser}>`,
                to: emailToSend,
                subject: 'Mã xác thực OTP - Finance Manager',
                text: `Mã xác thực (OTP) của bạn là: ${otpCode}. Mã này có hiệu lực trong 5 phút.`,
                html: `
                  <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; max-width: 500px; margin: 0 auto;">
                    <h2 style="color: #4f46e5; text-align: center;">Mã Xác Thực Bảo Mật</h2>
                    <p>Xin chào,</p>
                    <p>Hệ thống vừa nhận được yêu cầu truy cập bảo mật.</p>
                    <div style="text-align: center; margin: 20px 0;">
                      <span style="background: #f3f4f6; padding: 15px 30px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333;">${otpCode}</span>
                    </div>
                    <p style="color: #666; font-size: 13px;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="color: #999; font-size: 11px; text-align: center;">Sent via secure SMTP channel.</p>
                  </div>
                `
            });

            return res.status(200).json({ success: true, message: "OTP sent successfully" });

        } catch (emailError) {
            console.error("Email send failed:", emailError);
            return res.status(500).json({ error: "Gửi Email thất bại. Kiểm tra Mật khẩu ứng dụng (App Password) hoặc cấu hình SMTP." });
        }
    }

    // 5. Verify OTP
    if (action === 'verify_otp') {
        const rows = await sql`SELECT otp_code FROM investment_security WHERE user_id = ${userId}`;
        if (rows.length === 0) return res.status(400).json({ error: "User not found" });

        const dbOtp = rows[0].otp_code;
        
        if (dbOtp && dbOtp === otp) {
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