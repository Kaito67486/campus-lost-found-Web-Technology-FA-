-- schema.sql
-- Campus Lost & Found (MySQL-only, session auth)

CREATE DATABASE IF NOT EXISTS campus_lost_found
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE campus_lost_found;

-- =========================
-- USERS (Login/Register)
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at BIGINT NOT NULL
) ENGINE=InnoDB;

-- =========================
-- COUNTERS (L-001 / F-001)
-- =========================
CREATE TABLE IF NOT EXISTS counters (
  name VARCHAR(20) PRIMARY KEY,   -- 'lost' or 'found'
  seq INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- seed counters if not exist
INSERT IGNORE INTO counters (name, seq) VALUES ('lost', 0);
INSERT IGNORE INTO counters (name, seq) VALUES ('found', 0);

-- =========================
-- ITEMS (Lost/Found Reports)
-- =========================
CREATE TABLE IF NOT EXISTS items (
  id INT AUTO_INCREMENT PRIMARY KEY,

  reference_code VARCHAR(10) NOT NULL UNIQUE,  -- L-001 / F-001

  category ENUM('Lost','Found') NOT NULL,
  status ENUM('Active','Claimed','Resolved') NOT NULL DEFAULT 'Active',

  title VARCHAR(60) NOT NULL,
  description VARCHAR(500) NOT NULL,
  location VARCHAR(80) NOT NULL,
  date VARCHAR(10) NOT NULL,                  -- store as YYYY-MM-DD string (simple)
  contact VARCHAR(120) NOT NULL,

  owner_user_id INT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,

  CONSTRAINT fk_items_owner
    FOREIGN KEY (owner_user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

-- Indexes to improve filtering
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_created_at ON items(created_at);

-- =========================
-- CONTACT MESSAGES (Optional)
-- =========================
CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(190) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  created_at BIGINT NOT NULL
) ENGINE=InnoDB;