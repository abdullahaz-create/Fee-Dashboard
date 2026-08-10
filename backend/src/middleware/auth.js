const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

/**
 * Verify JWT and attach decoded user to req.user
 * Works for both admin and teacher tokens.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role: 'admin'|'teacher', teacherCode?, name? }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

/**
 * Only allow admin role.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

/**
 * Only allow teacher role.
 */
function requireTeacher(req, res, next) {
  if (!req.user || req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Forbidden: Teacher access required' });
  }
  next();
}

/**
 * Allow both admin and teacher.
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireTeacher, requireAuth };
