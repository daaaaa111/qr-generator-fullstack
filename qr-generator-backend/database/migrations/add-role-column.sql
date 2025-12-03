-- Add role column to users table
ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';

UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
