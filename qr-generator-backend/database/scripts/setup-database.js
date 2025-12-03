const pool = require('../../src/config/db');

async function setupDatabase() {
    const client = await pool.connect();
    try {
        console.log('🚀 Bắt đầu khởi tạo Database...');

        // 1. Tạo bảng Users
        console.log('🔹 Đang tạo bảng users...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                google_id VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255),
                display_name VARCHAR(255),
                profile_picture TEXT,
                role VARCHAR(50) DEFAULT 'user', -- Thêm sẵn cột role
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Tạo bảng QR Codes
        console.log('🔹 Đang tạo bảng qr_codes...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS qr_codes (
                id SERIAL PRIMARY KEY,
                program_name VARCHAR(255),
                custom_code VARCHAR(255) UNIQUE NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Tạo bảng Profiles
        console.log('🔹 Đang tạo bảng profiles...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS profiles (
                profile_id VARCHAR(255) PRIMARY KEY,
                user_google_id VARCHAR(255) NOT NULL,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                phone VARCHAR(50),
                email VARCHAR(255),
                company VARCHAR(255),
                job_title VARCHAR(255),
                avatar_base64 TEXT,
                links JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_google_id) REFERENCES users(google_id) ON DELETE CASCADE
            );
        `);

        // 4. Tạo Indexes (Tăng tốc độ)
        console.log('🔹 Đang tạo Indexes...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes(user_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_qr_codes_created_at ON qr_codes(created_at);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_profiles_user_google_id ON profiles(user_google_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);`);

        console.log('✅ Setup Database thành công!');
    } catch (error) {
        console.error('❌ Lỗi setup:', error.message);
    } finally {
        client.release();
        await pool.end(); // Đóng kết nối để script tự dừng
    }
}

setupDatabase();