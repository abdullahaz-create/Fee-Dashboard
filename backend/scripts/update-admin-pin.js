/**
 * update-admin-pin.js
 * ---------------------------------------------------------------------------
 * Safe, targeted script to update the admin PIN to "1100".
 * Does NOT touch any student, fee, payment, or subject records.
 * Run once: node backend/scripts/update-admin-pin.js
 * ---------------------------------------------------------------------------
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const newPin = '1100';
  const passwordHash = await bcrypt.hash(newPin, 10);

  const existing = await prisma.admin.findFirst();
  if (!existing) {
    console.error('❌ No admin account found. Run: node prisma/seed.js first.');
    process.exit(1);
  }

  await prisma.admin.update({
    where: { id: existing.id },
    data: { passwordHash },
  });

  console.log('✅ Admin PIN updated to: 1100');
  console.log('   (All student, fee, and payment data is untouched.)');
}

main()
  .catch((e) => { console.error('❌ Update failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
