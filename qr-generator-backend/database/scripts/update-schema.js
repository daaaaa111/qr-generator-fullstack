const path = require('path');
// Load file .env từ thư mục gốc
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('../../src/config/db');

async function updateSchema() {
    const client = await pool.connect();
    try {
        console.log('🚀 Bắt đầu cập nhật Schema...');

        // 1. Thêm cột role (Phần này an toàn, giữ nguyên)
        try {
            console.log('🔹 Kiểm tra cột "role"...');
            await client.query(`
                ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
            `);
            console.log('   ✅ Đã kiểm tra/thêm cột "role".');
        } catch (err) {
            console.error('   ⚠️ Lỗi khi thêm cột:', err.message);
        }

        // 2. Cập nhật Admin (SỬA PHẦN NÀY)
        // Lấy email từ biến môi trường hoặc tham số dòng lệnh
        const adminEmail = process.env.ADMIN_EMAIL || process.argv[2];

        if (!adminEmail) {
            console.log('   ⚠️  Không tìm thấy ADMIN_EMAIL trong .env hoặc tham số. Bỏ qua bước set Admin.');
            console.log('       -> Cách dùng: node scripts/updateSchema.js admin@email.com');
        } else {
            console.log(`🔹 Đang set quyền Admin cho: ${adminEmail}`);
            
            const res = await client.query(
                "UPDATE users SET role = 'admin' WHERE email = $1 RETURNING *", 
                [adminEmail]
            );

            if (res.rowCount > 0) {
                console.log('   ✅ Cập nhật quyền Admin thành công!');
            } else {
                console.log(`   ⚠️  Không tìm thấy user "${adminEmail}" trong database.`);
                console.log('       -> Hãy đăng nhập Google bằng email này 1 lần rồi chạy lại script.');
            }
        }

    } catch (error) {
        console.error('❌ Lỗi cập nhật:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

updateSchema();