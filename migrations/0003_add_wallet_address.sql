
-- Migration 0003: Add wallet_address column
-- Created: 2025-01-01

ALTER TABLE "bot_config" ADD COLUMN IF NOT EXISTS "wallet_address" text;

-- Update meta journal
UPDATE _journal SET version = 3 WHERE id = (SELECT MAX(id) FROM _journal);
