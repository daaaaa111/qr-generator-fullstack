const pool = require('../../src/config/db');

async function checkDatabase() {
    try {
        console.log('🔍 Đang kiểm tra kết nối database...');
        
        // 1. Test kết nối
        const testResult = await pool.query('SELECT NOW()');
        console.log('✅ Kết nối database thành công!');
        console.log('   Thời gian server:', testResult.rows[0].now);
        
        // 2. Kiểm tra các bảng
        console.log('\n📋 Đang kiểm tra các bảng...');
        const tables = ['users', 'qr_codes', 'profiles'];
        
        for (const table of tables) {
            const result = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [table]);
            
            if (result.rows[0].exists) {
                console.log(`   ✅ Bảng "${table}" đã tồn tại`);
                
                // Liệt kê các cột
                const columns = await pool.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = $1
                    ORDER BY ordinal_position;
                `, [table]);
                console.log(`      Cột: ${columns.rows.map(c => c.column_name).join(', ')}`);
            } else {
                console.log(`   ❌ Bảng "${table}" CHƯA tồn tại`);
            }
        }
        
        // 3. Kiểm tra cột user_id (Logic cũ của bạn)
        console.log('\n🔍 Kiểm tra chi tiết bảng qr_codes...');
        // Logic này nên để setup-database lo, nhưng giữ lại để check
        const qrColumns = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'qr_codes' AND column_name = 'user_id';
        `);
        
        if (qrColumns.rows.length > 0) {
            console.log('   ✅ Cột user_id đã tồn tại.');
        } else {
            console.log('   ⚠️  Cột user_id chưa có (Hãy chạy npm run db:setup).');
        }
        
        console.log('\n✅ Kiểm tra hoàn tất!');
        process.exit(0);
        
    } catch (error) {
        console.error('\n❌ Lỗi kết nối:', error.message);
        console.error('👉 Gợi ý: Kiểm tra file .env và đảm bảo PostgreSQL đang chạy.');
        process.exit(1);
    }
}

checkDatabase();