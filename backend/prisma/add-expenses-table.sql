-- ============================================================
-- PAK ACADEMY FEE DASHBOARD — EXPENSE TABLE MIGRATION
-- ============================================================
-- Run this SQL in your Neon database SQL editor:
--   https://console.neon.tech → Select your project → SQL Editor
--
-- This is a SAFE, ADDITIVE migration.
-- It does NOT modify any existing tables (students, fees, payments, etc.)
-- It only CREATES the new "expenses" table if it doesn't already exist.
-- ============================================================

CREATE TABLE IF NOT EXISTS "expenses" (
  "id"         SERIAL PRIMARY KEY,
  "name"       TEXT NOT NULL,
  "month"      INTEGER NOT NULL,
  "year"       INTEGER NOT NULL,
  "amount"     DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "expenses_name_month_year_key" UNIQUE ("name", "month", "year")
);

-- Create a trigger to auto-update "updated_at" on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_expenses_updated_at ON "expenses";
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON "expenses"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify the table was created
SELECT 'expenses table created successfully ✓' AS status;
