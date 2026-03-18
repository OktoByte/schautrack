const { pool } = require('../db/pool');
const { toInt } = require('../lib/utils');

async function getUserById(id) {
  const { rows } = await pool.query(
    'SELECT id, email, daily_goal, totp_enabled, totp_secret, timezone, weight_unit, timezone_manual, preferred_ai_provider, ai_key, ai_endpoint, ai_model, ai_daily_limit, macros_enabled, macro_goals, goal_threshold FROM users WHERE id = $1',
    [id]
  );
  const user = rows[0];
  if (!user) return null;
  return { ...user, id: toInt(user.id) };
}

// Admin email - user with this email gets admin access
const adminEmail = process.env.ADMIN_EMAIL || null;

const isAdmin = (user) => {
  return adminEmail && user && user.email.toLowerCase() === adminEmail.toLowerCase();
};

const attachUser = async (req, res, next) => {
  if (!req.session.userId) {
    req.currentUser = null;
    return next();
  }

  try {
    req.currentUser = await getUserById(req.session.userId) || null;
  } catch (err) {
    console.error('Failed to load user from session', err);
    req.currentUser = null;
  }
  next();
};

const requireLogin = (req, res, next) => {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.currentUser || !isAdmin(req.currentUser)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = {
  getUserById,
  isAdmin,
  attachUser,
  requireLogin,
  requireAdmin
};