-- Users Table for Authentication
-- Run this SQL to create the users table

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
);

-- Sample insert (password is 'password123' hashed with bcrypt)
-- Note: Use bcrypt.hashSync('password123', 10) in your application to generate hashes
-- INSERT INTO users (username, email, password) VALUES ('admin', 'admin@example.com', '$2b$10$...hashed_password_here...');
