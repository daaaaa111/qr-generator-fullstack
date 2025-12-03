const { Pool } = require('pg');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Kiểm tra xem các biến quan trọng có tồn tại không
if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    console.error("❌ LỖI: Thiếu biến môi trường DB_USER, DB_PASSWORD hoặc DB_NAME trong file .env");
    process.exit(1); 
}

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST || 'localhost', // Host có thể để mặc định
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD, // ⚠️ KHÔNG ĐỂ GIÁ TRỊ MẶC ĐỊNH Ở ĐÂY
    port: parseInt(process.env.DB_PORT || '5432'),
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

module.exports = pool;