/**
 * migrate-and-update-pin.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses Neon's serverless HTTP driver to:
 *   1. Create the expenses table (if not exists)
 *   2. Update the admin PIN to "1100"
 *
 * This bypasses TCP port 5432 restrictions by using Neon's HTTPS endpoint.
 *
 * Run: node backend/scripts/migrate-and-update-pin.js
 * ─────────────────────────────────────────────────────────────────────────────
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const sql = neon(connectionString);

async function main() {
  console.log('🔗 Connecting to Neon via HTTPS...\n');

  // ── 1. Create expenses table ─────────────────────────────────────────────
  console.log('📋 Step 1: Creating expenses table...');
  await sql`
    CREATE TABLE IF NOT EXISTS "expenses" (
      "id"         SERIAL PRIMARY KEY,
      "name"       TEXT NOT NULL,
      "month"      INTEGER NOT NULL,
      "year"       INTEGER NOT NULL,
      "amount"     DOUBLE PRECISION NOT NULL,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "expenses_name_month_year_key" UNIQUE ("name", "month", "year")
    )
  `;
  console.log('   ✅ expenses table created (or already exists)\n');

  // ── 2. Create updated_at trigger function ────────────────────────────────
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql'
  `;

  await sql`DROP TRIGGER IF EXISTS update_expenses_updated_at ON "expenses"`;
  await sql`
    CREATE TRIGGER update_expenses_updated_at
      BEFORE UPDATE ON "expenses"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
  `;
  console.log('   ✅ updated_at trigger created\n');

  // ── 3. Update admin PIN to 1100 ──────────────────────────────────────────
  console.log('🔐 Step 2: Updating admin PIN to 1100...');
  const newPin = '1100';
  const passwordHash = await bcrypt.hash(newPin, 10);

  const admins = await sql`SELECT id FROM admins LIMIT 1`;
  if (admins.length === 0) {
    await sql`INSERT INTO admins (password_hash) VALUES (${passwordHash})`;
    console.log('   ✅ Admin account created with PIN: 1100\n');
  } else {
    await sql`UPDATE admins SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${admins[0].id}`;
    console.log('   ✅ Admin PIN updated to: 1100\n');
  }

  console.log('─'.repeat(50));
  console.log('✅ All done! Summary:');
  console.log('   • expenses table: created');
  console.log('   • Admin PIN: 1100');
  console.log('   • All existing data: untouched');
  console.log('─'.repeat(50));
}

main().catch((e) => {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
});
