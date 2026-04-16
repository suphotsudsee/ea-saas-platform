-- ─── EA SaaS Platform — MySQL Initialization ─────────────────────────────────
-- Runs on first container startup to configure the database
-- ─────────────────────────────────────────────────────────────────────────────

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS ea_saas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant privileges to application user
GRANT ALL PRIVILEGES ON ea_saas.* TO 'ea_user'@'%';
FLUSH PRIVILEGES;

-- Set default character set for the database
USE ea_saas;
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;