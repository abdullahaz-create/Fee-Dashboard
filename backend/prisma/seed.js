const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Setting up academy admin account...');
  const newPassword = 'zahidparvez1100';
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const existing = await prisma.admin.findFirst();
  if (!existing) {
    await prisma.admin.create({ data: { passwordHash } });
    console.log('Admin account created.');
  } else {
    await prisma.admin.update({
      where: { id: existing.id },
      data: { passwordHash },
    });
    console.log('Admin password updated to zahidparvez1100.');
  }

  console.log('');
  console.log(`Admin Password: ${newPassword}`);
  console.log('Login at http://localhost:5173');
}

main()
  .catch((e) => { console.error('Setup failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
