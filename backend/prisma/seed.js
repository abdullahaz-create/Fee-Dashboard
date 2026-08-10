const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Setting up academy admin account...');
  const existing = await prisma.admin.findFirst();
  if (!existing) {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    await prisma.admin.create({ data: { passwordHash } });
    console.log('Admin account created.');
  } else {
    console.log('Admin account already exists — skipping creation.');
  }
  console.log('');
  console.log('Admin Password: Admin@123');
  console.log('Login at http://localhost:5173');
}

main()
  .catch((e) => { console.error('Setup failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
