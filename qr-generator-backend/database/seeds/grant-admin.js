require('dotenv').config(); // Load .env từ root
const { Pool } = require('pg');

// 1. Dùng biến môi trường để kết nối DB (AN TOÀN)
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function grantAdmin() {
    // 2. Lấy email từ tham số dòng lệnh hoặc .env (AN TOÀN)
    // Cách chạy: node scripts/grant-admin.js admin@example.com
    const targetEmail = process.argv[2] || process.env.ADMIN_EMAIL;

    if (!targetEmail) {
        console.error("❌ Vui lòng cung cấp email cần set Admin (VD: node scripts/grant-admin.js user@mail.com)");
        process.exit(1);
    }

    const client = await pool.connect();
    try {
        console.log('✅ Kết nối database thành công!');
        
try {
            const alterQuery = "ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user'";
            await client.query(alterQuery);
            console.log('✅ Đã thêm cột "role" vào bảng "users".');
        } catch (e) {
            if (e.message.includes('column "role" of relation "users" already exists')) {
                console.warn('⚠️ Cột "role" đã tồn tại, bỏ qua việc thêm cột.');
            } else {
                throw e;
            }
        }
        // Update role
        const updateQuery = "UPDATE users SET role = 'admin' WHERE email = $1";
        const res = await client.query(updateQuery, [targetEmail]);
        
        if (res.rowCount > 0) {
            console.log(`✅ Đã gán vai trò "admin" cho ${targetEmail}`);
        } else {
            console.warn(`⚠️ Không tìm thấy user: ${targetEmail}`);
        }

    } catch (error) {
        console.error('❌ Lỗi:', error.message);
    } finally {
        await client.release();
        await pool.end();
    }
}

grantAdmin();