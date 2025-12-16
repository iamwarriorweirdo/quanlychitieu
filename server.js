import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';

// CẤU HÌNH SERVER
const app = express();
const PORT = 3001;

// Middleware
app.use(cors()); // Cho phép Frontend gọi API
app.use(express.json()); // Phân tích body JSON

// KẾT NỐI DATABASE (Bảo mật: Chỉ server mới biết chuỗi này)
const DATABASE_URL = 'postgresql://neondatabase_owner:npg_elbT7PcY4LiA@ep-ancient-mountain-a1cc2mgg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DATABASE_URL);

// --- API ROUTES ---

// 1. Khởi tạo Database
app.post('/api/init', async (req, res) => {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        amount NUMERIC NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at BIGINT NOT NULL
      );
    `;
    res.json({ message: "Database initialized" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Init failed" });
  }
});

// 2. Đăng ký
app.post('/api/auth/register', async (req, res) => {
  const { id, username, password } = req.body;
  try {
    // Check existing
    const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing.length > 0) {
      return res.status(400).json({ error: "Tài khoản đã tồn tại" });
    }
    // Insert
    await sql`
      INSERT INTO users (id, username, password)
      VALUES (${id}, ${username}, ${password})
    `;
    res.json({ id, username });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Đăng nhập
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const users = await sql`
      SELECT id, username, password 
      FROM users 
      WHERE username = ${username}
    `;

    if (users.length > 0) {
      const user = users[0];
      if (user.password === password) {
        // Trong thực tế nên dùng JWT token, ở đây trả về user info đơn giản
        return res.json({ id: user.id, username: user.username });
      }
    }
    res.status(401).json({ error: "Sai tên đăng nhập hoặc mật khẩu" });
  } catch (error) {
    res.status(500).json({ error: "Login error" });
  }
});

// 4. Lấy danh sách giao dịch
app.get('/api/transactions', async (req, res) => {
  const { userId } = req.query;
  try {
    const rows = await sql`
      SELECT * FROM transactions 
      WHERE user_id = ${userId} 
      ORDER BY created_at DESC
    `;
    // Convert numeric strings to numbers
    const transactions = rows.map(row => ({
      ...row,
      amount: Number(row.amount),
      created_at: Number(row.created_at)
    }));
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: "Fetch error" });
  }
});

// 5. Thêm giao dịch
app.post('/api/transactions', async (req, res) => {
  const { userId, transaction } = req.body;
  try {
    await sql`
      INSERT INTO transactions (id, user_id, amount, type, category, description, date, created_at)
      VALUES (${transaction.id}, ${userId}, ${transaction.amount}, ${transaction.type}, ${transaction.category}, ${transaction.description}, ${transaction.date}, ${transaction.createdAt})
    `;
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Save error" });
  }
});

// 6. Xóa giao dịch
app.delete('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  const { userId } = req.query; // Security check
  try {
    await sql`
      DELETE FROM transactions 
      WHERE id = ${id} AND user_id = ${userId}
    `;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Delete error" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});