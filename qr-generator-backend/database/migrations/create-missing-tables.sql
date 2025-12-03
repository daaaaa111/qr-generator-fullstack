-- Script tạo các bảng còn thiếu (chạy trong database qr_code_db)
-- Chạy: psql -U postgres -d qr_code_db -f create-missing-tables.sql

-- Tạo bảng users (nếu chưa có)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    display_name VARCHAR(255),
    profile_picture TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo bảng qr_codes (nếu chưa có)
CREATE TABLE IF NOT EXISTS qr_codes (
    id SERIAL PRIMARY KEY,
    program_name VARCHAR(255),
    custom_code VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thêm cột user_id vào qr_codes (nếu chưa có)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'qr_codes' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE qr_codes 
        ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes(user_id);
    END IF;
END $$;

-- Tạo bảng profiles (nếu chưa có)
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Thêm foreign key cho profiles (nếu chưa có)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'profiles' 
        AND constraint_name LIKE '%user_google_id%'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT fk_profiles_user_google_id 
        FOREIGN KEY (user_google_id) REFERENCES users(google_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Tạo các index (nếu chưa có)
CREATE INDEX IF NOT EXISTS idx_qr_codes_created_at ON qr_codes(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_user_google_id ON profiles(user_google_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

SELECT 'Đã kiểm tra và tạo các bảng/cột còn thiếu!' AS message;

