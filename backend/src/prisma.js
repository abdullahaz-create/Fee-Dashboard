/**
 * Prisma singleton for serverless environments.
 * In serverless (Vercel), each hot module reload would create a new PrismaClient
 * and exhaust the database connection pool. This pattern reuses a single instance.
 */
const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
