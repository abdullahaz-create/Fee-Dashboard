const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Single admin password-only login
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || !password.trim()) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const admin = await prisma.admin.findFirst();
    if (!admin) {
      return res.status(401).json({ error: 'Admin account not set up. Run: node prisma/seed.js' });
    }

    const valid = await bcrypt.compare(password.trim(), admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid password. Please try again.' });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'admin' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ token, user: { id: admin.id, role: 'admin', name: 'Admin' } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
