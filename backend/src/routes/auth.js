const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Admin password-only login
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
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message,
      code: err.code,
      meta: err.meta
    });
  }
});

// ─── POST /api/auth/member-login ──────────────────────────────────────────────
// Member PIN login — grants read-only (member) access
router.post('/member-login', (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !String(pin).trim()) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    const MEMBER_PIN = process.env.MEMBER_PIN || '8410';
    if (String(pin).trim() !== MEMBER_PIN) {
      return res.status(401).json({ error: 'Invalid PIN. Please try again.' });
    }

    const token = jwt.sign(
      { id: 'member', role: 'member' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ token, user: { id: 'member', role: 'member', name: 'Member' } });
  } catch (err) {
    console.error('Member login error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
