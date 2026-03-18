const crypto = require('crypto');

// Session-based CSRF protection
// The SPA fetches the token via GET /api/csrf and sends it via X-CSRF-Token header

function generateCsrfToken(req) {
  if (!req.session) return '';
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

function validateCsrfToken(req) {
  const headerToken = req.headers['x-csrf-token'];
  const bodyToken = req.body?._csrf; // fallback for multipart form uploads
  const token = headerToken || bodyToken;
  if (!token || !req.session?.csrfToken) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(req.session.csrfToken);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Middleware: ensure CSRF token exists in session (lazy — only created when needed)
const addCsrfToken = (req, res, next) => {
  // Token is created on-demand via generateCsrfToken when GET /api/csrf is called
  next();
};

// Middleware: validate CSRF token on state-changing requests
const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  if (!validateCsrfToken(req)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
};

module.exports = {
  addCsrfToken,
  csrfProtection,
  generateCsrfToken,
  validateCsrfToken
};
