const { execSync } = require('child_process');

console.log('🏁 Starting Vercel backend build script...');

try {
  // 1. Always run prisma generate
  console.log('Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma Client generated successfully.');

  // 2. Check DATABASE_URL environment variable
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.warn('⚠️  DATABASE_URL environment variable is missing.');
    console.warn('👉 Skipping database push & seed. Please configure DATABASE_URL in Vercel settings.');
    process.exit(0);
  }

  if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
    console.warn('⚠️  DATABASE_URL points to localhost.');
    console.warn('👉 Skipping database push & seed. Localhost is not accessible in Vercel production.');
    process.exit(0);
  }

  // 3. Run db push and seed on valid production database
  console.log('Pushing database schema to production database...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log('✅ Database schema pushed successfully.');

  console.log('Seeding database...');
  execSync('node prisma/seed.js', { stdio: 'inherit' });
  console.log('✅ Database seeded successfully.');

} catch (error) {
  console.error('❌ Build script encountered an error:', error);
  // Exit with 0 to prevent blocking deployment, as the database can be migrated/pushed separately
  // or will be accessible once the user configures the Vercel env vars properly.
  process.exit(0);
}
