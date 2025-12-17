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
        
        // If updating email/otp, we assume password is provided or preserved.
        // For partial updates, we might need a more complex logic, but here we assume the client sends the current password if it exists.
        
        // Check if user exists to handle UPSERT correctly or decide insert/update
        const existing = await sql`SELECT user_id FROM investment_security WHERE user_id = ${userId}`;
        
        if (existing.length === 0) {
             // Create new
             await sql`
                INSERT INTO investment_security (user_id, secondary_password, is_otp_enabled, email)
                VALUES (${userId}, ${password}, ${isOtp}, ${email})
            `;
        } else {
             // Update
             // If email is provided, we update it. If not, we keep it.
             // If password provided, update it.
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

    // 4. Request OTP (Real Email or Simulation)
    if (action === 'request_otp') {
        // Generate a 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to Database (Server-side verification)
        // We need to ensure the row exists. If it's a new user trying to Link Email immediately (rare but possible), we might fail.
        // Usually, 'setup' with password runs first.
        
        // Try update, if 0 rows affected, it implies user hasn't set up password yet.
        const updateResult = await sql`
            UPDATE investment_security 
            SET otp_code = ${otpCode} 
            WHERE user_id = ${userId}
            RETURNING user_id
        `;
        
        if (updateResult.length === 0) {
             // Create a temporary row? No, enforce password setup first.
             return res.status(400).json({ error: "Please set up a security password first." });
        }

        // Determine email recipient
        let emailToSend = targetEmail; 

        // If no target email provided (e.g. login flow), get from DB
        if (!emailToSend) {
            const userRows = await sql`SELECT email FROM investment_security WHERE user_id = ${userId}`;
            emailToSend = userRows[0]?.email;
        }

        if (!emailToSend) {
             return res.status(400).json({ error: "No email address found or provided." });
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
                    to: emailToSend,
                    subject: 'Mã xác thực OTP - Đầu tư',
                    text: `Mã xác thực (OTP) của bạn là: ${otpCode}.`,
                    html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                            <h2 style="color: #4f46e5;">Mã xác thực bảo mật</h2>
                            <p>Xin chào,</p>
                            <p>Đây là mã OTP để xác thực tài khoản của bạn:</p>
                            <h1 style="background: #f3f4f6; padding: 10px 20px; display: inline-block; border-radius: 8px; letter-spacing: 5px;">${otpCode}</h1>
                            <p>Mã này có hiệu lực trong thời gian ngắn.</p>
                           </div>`
                });

                return res.status(200).json({ success: true, message: "OTP sent to " + emailToSend });

            } catch (emailError) {
                console.error("Email send failed:", emailError);
                // Fallback to simulation if email fails
                return res.status(200).json({ 
                    success: true, 
                    demoOtpCode: otpCode, 
                    message: "Email sending failed. Showing OTP for simulation." 
                });
            }
        } else {
            // --- SIMULATION MODE (No Env Vars) ---
            return res.status(200).json({ 
                success: true, 
                demoOtpCode: otpCode, 
                message: "Simulation: EMAIL_USER not set. OTP generated." 
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