-- Migration: Add user_id to contacts table for multi-user support
-- Run this SQL to update the contacts table

-- Add user_id column to contacts table
ALTER TABLE contacts
ADD COLUMN user_id INT NOT NULL;

-- Add foreign key constraint
ALTER TABLE contacts
ADD CONSTRAINT fk_user
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE;

-- Add index for faster queries
ALTER TABLE contacts
ADD INDEX idx_user_id (user_id);

-- ============================================
-- ENHANCEMENT MIGRATIONS
-- Add columns for favorites, photos, and categories
-- ============================================

-- Add is_favorite column
ALTER TABLE contacts
ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;

-- Add photo column for storing uploaded photo path
ALTER TABLE contacts
ADD COLUMN photo VARCHAR(255);

-- Add category column for grouping contacts
ALTER TABLE contacts
ADD COLUMN category VARCHAR(50);

-- Add index for favorite filtering
ALTER TABLE contacts
ADD INDEX idx_is_favorite (is_favorite);

-- Add index for category filtering
ALTER TABLE contacts
ADD INDEX idx_category (category);

