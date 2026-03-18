const express = require('express');
const rateLimit = require('express-rate-limit');
const argon2 = require('argon2');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const { pool } = require('../db/pool');

// Authenticated sessions last 30 days (rolling). Anonymous sessions use a
// shorter default (set in app.js) so bot/crawler sessions expire quickly.
const AUTH_SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days

/**
 * Verify password against hash, supporting both argon2 and legacy bcrypt.
 * If bcrypt hash matches, re-hashes with argon2 and updates the DB.
 */
async function verifyAndMigratePassword(passwordHash, password, userId) {
  if (!passwordHash || !password) return false;

  if (passwordHash.startsWith('$2b$') || passwordHash.startsWith('$2a$')) {
    const valid = await bcrypt.compare(password, passwordHash);
    if (valid && userId) {
      const newHash = await argon2.hash(password);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
    }
    return valid;
  }

  return argon2.verify(passwordHash, password);
}
const { requireLogin } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');
const { generateCaptcha, verifyCaptcha } = require('../lib/captcha');
const { 
  isSmtpConfigured, 
  generateResetCode, 
  sendVerificationEmail, 
  sendEmailChangeVerification, 
  sendEmail 
} = require('../lib/email');
const { getClientTimezone } = require('../lib/utils');

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 attempts per windowMs
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // max 5 attempts per windowMs
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

// Helper functions for tokens
async function createPasswordResetToken(userId) {
  const code = generateResetCode();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  await pool.query(
    'DELETE FROM password_reset_tokens WHERE user_id = $1 AND used = FALSE',
    [userId]
  );
  await pool.query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, code, expiresAt]
  );
  return code;
}

async function verifyPasswordResetToken(email, token) {
  const { rows } = await pool.query(
    `SELECT prt.id, prt.user_id, prt.expires_at, u.email
     FROM password_reset_tokens prt
     JOIN users u ON u.id = prt.user_id
     WHERE u.email = $1 AND prt.token = $2 AND prt.used = FALSE
     ORDER BY prt.created_at DESC
     LIMIT 1`,
    [email.toLowerCase().trim(), token]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  if (new Date(row.expires_at) < new Date()) return null;
  return { tokenId: row.id, userId: row.user_id };
}

async function markTokenUsed(tokenId) {
  await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [tokenId]);
}

async function cleanExpiredTokens() {
  await pool.query('DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = TRUE');
  await pool.query('DELETE FROM email_verification_tokens WHERE expires_at < NOW() OR used = TRUE');
  // Delete unverified users with no remaining verification tokens
  await pool.query(`
    DELETE FROM users
    WHERE email_verified = FALSE
      AND id NOT IN (SELECT DISTINCT user_id FROM email_verification_tokens WHERE used = FALSE)
  `);
}

// Run cleanup every 15 minutes (skip in tests to avoid open handles)
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => { cleanExpiredTokens().catch(err => console.error('Token cleanup error', err)); }, 15 * 60 * 1000).unref();
}

// Email verification helpers
async function createEmailVerificationToken(userId) {
  const code = generateResetCode();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  await pool.query(
    'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, code, expiresAt]
  );
  return code;
}

async function verifyEmailToken(email, token) {
  const { rows } = await pool.query(
    `SELECT evt.id, evt.user_id, evt.expires_at, u.email
     FROM email_verification_tokens evt
     JOIN users u ON u.id = evt.user_id
     WHERE u.email = $1 AND evt.token = $2 AND evt.used = FALSE
     ORDER BY evt.created_at DESC
     LIMIT 1`,
    [email.toLowerCase().trim(), token]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  if (new Date(row.expires_at) < new Date()) return null;
  return { tokenId: row.id, userId: row.user_id };
}

async function markEmailVerificationUsed(tokenId) {
  await pool.query('UPDATE email_verification_tokens SET used = TRUE WHERE id = $1', [tokenId]);
}

async function markUserVerified(userId) {
  await pool.query('UPDATE users SET email_verified = TRUE WHERE id = $1', [userId]);
}

async function createEmailChangeToken(userId, newEmail) {
  const code = generateResetCode();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  await pool.query(
    'INSERT INTO email_verification_tokens (user_id, token, expires_at, new_email) VALUES ($1, $2, $3, $4)',
    [userId, code, expiresAt, newEmail.toLowerCase().trim()]
  );
  return code;
}

async function verifyEmailChangeToken(userId, token) {
  const { rows } = await pool.query(
    `SELECT id, new_email, expires_at
     FROM email_verification_tokens
     WHERE user_id = $1 AND token = $2 AND used = FALSE AND new_email IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, token]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  if (new Date(row.expires_at) < new Date()) return null;
  return { tokenId: row.id, newEmail: row.new_email };
}

// ---- SPA JSON Auth API ----

router.post('/api/auth/login', authLimiter, csrfProtection, async (req, res) => {
  const { email, password, token, captcha } = req.body;
  const pendingUserId = req.session.pendingUserId;
  const failedAttempts = req.session.loginFailedAttempts || 0;

  const recordFailure = () => {
    req.session.loginFailedAttempts = (req.session.loginFailedAttempts || 0) + 1;
  };

  try {
    // TOTP step
    if (token && pendingUserId) {
      const { getUserById } = require('../middleware/auth');
      const pendingUser = await getUserById(pendingUserId);
      if (!pendingUser || !pendingUser.totp_enabled || !pendingUser.totp_secret) {
        delete req.session.pendingUserId;
        return res.status(400).json({ ok: false, error: 'Invalid 2FA session.' });
      }
      const ok = speakeasy.totp.verify({ secret: pendingUser.totp_secret, encoding: 'base32', token, window: 1 });
      if (!ok) {
        return res.status(401).json({ ok: false, error: 'Invalid 2FA code.' });
      }
      return req.session.regenerate((err) => {
        if (err) return res.status(500).json({ ok: false, error: 'Session error.' });
        req.session.userId = pendingUser.id;
        req.session.cookie.maxAge = AUTH_SESSION_MAX_AGE;
        return res.json({ ok: true });
      });
    }

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required.' });
    }

    if (failedAttempts >= 3) {
      if (!verifyCaptcha(req.session.captchaAnswer, captcha)) {
        const newCaptcha = generateCaptcha();
        req.session.captchaAnswer = newCaptcha.text;
        return res.status(400).json({ ok: false, error: 'Invalid captcha.', captchaSvg: newCaptcha.data, requireCaptcha: true });
      }
      delete req.session.captchaAnswer;
    }

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) {
      recordFailure();
      const attempts = req.session.loginFailedAttempts || 0;
      let captchaSvg = null;
      if (attempts >= 3) {
        const c = generateCaptcha();
        req.session.captchaAnswer = c.text;
        captchaSvg = c.data;
      }
      return res.status(401).json({ ok: false, error: 'Invalid credentials.', captchaSvg, requireCaptcha: attempts >= 3 });
    }

    const validPassword = await verifyAndMigratePassword(user.password_hash, password, user.id);
    if (!validPassword) {
      recordFailure();
      const attempts = req.session.loginFailedAttempts || 0;
      let captchaSvg = null;
      if (attempts >= 3) {
        const c = generateCaptcha();
        req.session.captchaAnswer = c.text;
        captchaSvg = c.data;
      }
      return res.status(401).json({ ok: false, error: 'Invalid credentials.', captchaSvg, requireCaptcha: attempts >= 3 });
    }

    if (isSmtpConfigured() && !user.email_verified) {
      req.session.verifyEmail = user.email;
      return res.json({ ok: false, requireVerification: true });
    }

    if (user.totp_enabled) {
      req.session.pendingUserId = user.id;
      return res.json({ ok: false, requireToken: true });
    }

    return req.session.regenerate((err) => {
      if (err) return res.status(500).json({ ok: false, error: 'Session error.' });
      req.session.userId = user.id;
      req.session.cookie.maxAge = AUTH_SESSION_MAX_AGE;
      return res.json({ ok: true });
    });
  } catch (err) {
    console.error('Login API error', err);
    return res.status(500).json({ ok: false, error: 'Could not log in.' });
  }
});

router.post('/api/auth/register', authLimiter, csrfProtection, async (req, res) => {
  const { step, email, password, timezone, captcha } = req.body;

  if (step === 'credentials') {
    const emailClean = (email || '').toLowerCase().trim();
    if (!emailClean || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required.' });
    }
    if (password.length < 10) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 10 characters.' });
    }
    try {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [emailClean]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ ok: false, error: 'Account already exists.' });
      }
      const detectedTz = timezone || getClientTimezone(req) || 'UTC';
      const passwordHash = await argon2.hash(password);
      req.session.pendingRegistration = { email: emailClean, passwordHash, timezone: detectedTz, createdAt: Date.now() };
      const newCaptcha = generateCaptcha();
      req.session.captchaAnswer = newCaptcha.text;
      return res.json({ ok: true, requireCaptcha: true, captchaSvg: newCaptcha.data });
    } catch (err) {
      console.error('Registration API error', err);
      return res.status(500).json({ ok: false, error: 'Could not register.' });
    }
  }

  if (step === 'captcha') {
    const pending = req.session.pendingRegistration;
    const PENDING_REG_EXPIRY = 30 * 60 * 1000;
    if (!pending || !pending.email || !pending.passwordHash ||
        (pending.createdAt && Date.now() - pending.createdAt > PENDING_REG_EXPIRY)) {
      delete req.session.pendingRegistration;
      return res.status(400).json({ ok: false, error: 'Registration session expired.' });
    }
    if (!verifyCaptcha(req.session.captchaAnswer, captcha)) {
      const newCaptcha = generateCaptcha();
      req.session.captchaAnswer = newCaptcha.text;
      return res.status(400).json({ ok: false, error: 'Invalid captcha.', captchaSvg: newCaptcha.data });
    }
    delete req.session.captchaAnswer;
    try {
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [pending.email]);
      if (existing.rows.length > 0) {
        delete req.session.pendingRegistration;
        return res.status(409).json({ ok: false, error: 'Account already exists.' });
      }
      if (isSmtpConfigured()) {
        const { rows } = await pool.query(
          'INSERT INTO users (email, password_hash, timezone, email_verified, macros_enabled) VALUES ($1, $2, $3, FALSE, $4) RETURNING id',
          [pending.email, pending.passwordHash, pending.timezone, JSON.stringify({ calories: true })]
        );
        const code = await createEmailVerificationToken(rows[0].id);
        await sendVerificationEmail(pending.email, code);
        delete req.session.pendingRegistration;
        req.session.verifyEmail = pending.email;
        return res.json({ ok: true, requireVerification: true });
      } else {
        const { rows } = await pool.query(
          'INSERT INTO users (email, password_hash, timezone, email_verified, macros_enabled) VALUES ($1, $2, $3, TRUE, $4) RETURNING id',
          [pending.email, pending.passwordHash, pending.timezone, JSON.stringify({ calories: true })]
        );
        delete req.session.pendingRegistration;
        req.session.userId = rows[0].id;
        req.session.cookie.maxAge = AUTH_SESSION_MAX_AGE;
        return res.json({ ok: true });
      }
    } catch (err) {
      console.error('Registration captcha API error', err);
      return res.status(500).json({ ok: false, error: 'Could not register.' });
    }
  }

  return res.status(400).json({ ok: false, error: 'Invalid step.' });
});

router.post('/api/auth/logout', requireLogin, csrfProtection, (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ ok: false });
    res.json({ ok: true });
  });
});

router.post('/api/auth/forgot-password', strictLimiter, csrfProtection, async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  const captchaAnswer = (req.body.captcha || '').trim();

  if (!isSmtpConfigured()) {
    return res.status(400).json({ ok: false, error: 'Password recovery not available.' });
  }
  if (!verifyCaptcha(req.session.captchaAnswer, captchaAnswer)) {
    const c = generateCaptcha();
    req.session.captchaAnswer = c.text;
    return res.status(400).json({ ok: false, error: 'Invalid captcha.', captchaSvg: c.data });
  }
  if (!email) {
    return res.status(400).json({ ok: false, error: 'Email is required.' });
  }

  try {
    const { rows } = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (user) {
      const code = await createPasswordResetToken(user.id);
      const subject = 'Password Reset Code - Schautrack';
      const text = `Your password reset code is: ${code}\n\nThis code expires in 30 minutes.`;
      const html = `<p>Your password reset code is:</p><h2 style="font-family: monospace; letter-spacing: 4px;">${code}</h2><p>This code expires in 30 minutes.</p>`;
      await sendEmail(user.email, subject, text, html);
    }
    delete req.session.captchaAnswer;
    req.session.resetEmail = email;
    req.session.resetCodeVerified = false;
    return res.json({ ok: true });
  } catch (err) {
    console.error('Forgot password API error', err);
    return res.status(500).json({ ok: false, error: 'Could not process request.' });
  }
});

router.post('/api/auth/reset-password', csrfProtection, async (req, res) => {
  const email = req.session.resetEmail || '';
  if (!email) {
    return res.status(400).json({ ok: false, error: 'No reset session.' });
  }

  const { code, password, confirm_password } = req.body;
  const codeVerified = req.session.resetCodeVerified || false;

  // Step 1: Verify code
  if (!codeVerified) {
    if (!code) return res.status(400).json({ ok: false, error: 'Code is required.' });
    try {
      const tokenResult = await verifyPasswordResetToken(email, code);
      if (!tokenResult) {
        return res.status(400).json({ ok: false, error: 'Invalid or expired code.' });
      }
      req.session.resetCodeVerified = true;
      req.session.resetTokenId = tokenResult.tokenId;
      req.session.resetUserId = tokenResult.userId;
      return res.json({ ok: true, codeVerified: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Verification failed.' });
    }
  }

  // Step 2: Set new password
  if (!password) return res.status(400).json({ ok: false, error: 'Password is required.' });
  if (password !== confirm_password) return res.status(400).json({ ok: false, error: 'Passwords do not match.' });
  if (password.length < 10) return res.status(400).json({ ok: false, error: 'Password must be at least 10 characters.' });

  try {
    const userId = req.session.resetUserId;
    const tokenId = req.session.resetTokenId;
    if (!userId || !tokenId) {
      delete req.session.resetEmail;
      return res.status(400).json({ ok: false, error: 'Session expired.' });
    }
    const hash = await argon2.hash(password);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
    await markTokenUsed(tokenId);
    delete req.session.resetEmail;
    delete req.session.resetCodeVerified;
    delete req.session.resetTokenId;
    delete req.session.resetUserId;
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Could not reset password.' });
  }
});

router.post('/api/auth/verify-email', csrfProtection, async (req, res) => {
  const email = req.session.verifyEmail || '';
  if (!email) return res.status(400).json({ ok: false, error: 'No verification session.' });

  const code = (req.body.code || '').trim();
  const verifyAttempts = req.session.verifyAttempts || 0;
  if (verifyAttempts >= 5) {
    return res.status(429).json({ ok: false, error: 'Too many attempts.' });
  }
  if (!code) return res.status(400).json({ ok: false, error: 'Code is required.' });

  try {
    const tokenResult = await verifyEmailToken(email, code);
    if (!tokenResult) {
      req.session.verifyAttempts = verifyAttempts + 1;
      return res.status(400).json({ ok: false, error: 'Invalid or expired code.' });
    }
    await markEmailVerificationUsed(tokenResult.tokenId);
    await markUserVerified(tokenResult.userId);
    delete req.session.verifyEmail;
    delete req.session.verifyAttempts;
    req.session.userId = tokenResult.userId;
    req.session.cookie.maxAge = AUTH_SESSION_MAX_AGE;
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Verification failed.' });
  }
});

router.post('/api/auth/verify-email/resend', csrfProtection, async (req, res) => {
  const email = req.session.verifyEmail || '';
  if (!email) return res.status(400).json({ ok: false, error: 'No verification session.' });

  const resendAttempts = req.session.resendAttempts || 0;
  if (resendAttempts >= 3) {
    return res.status(429).json({ ok: false, error: 'Too many resend requests.' });
  }

  if (resendAttempts > 0) {
    const lastResendAt = req.session.lastResendAt || 0;
    const elapsed = Date.now() - lastResendAt;
    if (elapsed < 300000) {
      const remaining = Math.ceil((300000 - elapsed) / 1000);
      return res.status(429).json({ ok: false, error: `Please wait ${remaining}s.`, cooldown: remaining });
    }
    const captchaAnswer = (req.body.captcha || '').trim();
    if (!verifyCaptcha(req.session.resendCaptchaAnswer, captchaAnswer)) {
      const c = generateCaptcha();
      req.session.resendCaptchaAnswer = c.text;
      return res.status(400).json({ ok: false, error: 'Invalid captcha.', captchaSvg: c.data, requireCaptcha: true });
    }
    delete req.session.resendCaptchaAnswer;
  }

  try {
    const { rows } = await pool.query('SELECT id, email_verified FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(400).json({ ok: false, error: 'User not found.' });
    if (user.email_verified) return res.json({ ok: true, alreadyVerified: true });

    const code = await createEmailVerificationToken(user.id);
    await sendVerificationEmail(email, code);
    req.session.resendAttempts = resendAttempts + 1;
    req.session.verifyAttempts = 0;
    req.session.lastResendAt = Date.now();

    // If this was the first resend, next one will need captcha
    if (resendAttempts === 0) {
      const c = generateCaptcha();
      req.session.resendCaptchaAnswer = c.text;
      return res.json({ ok: true, nextRequiresCaptcha: true, captchaSvg: c.data });
    }
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Could not resend.' });
  }
});

router.get('/api/auth/captcha', (req, res) => {
  const c = generateCaptcha();
  req.session.captchaAnswer = c.text;
  res.json({ svg: c.data });
});

// Account deletion
router.post('/delete', requireLogin, csrfProtection, async (req, res) => {
  const { password, token } = req.body;
  const { toInt } = require('../lib/utils');
  const userId = toInt(req.currentUser?.id);
  if (userId === null) {
    return res.status(401).json({ ok: false, error: 'Session invalid. Please log in again.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, totp_enabled, totp_secret FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Account not found. Please log in again.' });
    }

    const validPassword = await verifyAndMigratePassword(user.password_hash, password, user.id);
    if (!validPassword) {
      return res.status(401).json({ ok: false, error: 'Incorrect password.' });
    }

    if (user.totp_enabled) {
      if (!token) {
        return res.status(400).json({ ok: false, error: 'Enter your 2FA code to confirm deletion.' });
      }
      const totpOk = speakeasy.totp.verify({
        secret: user.totp_secret,
        encoding: 'base32',
        token,
        window: 1,
      });
      if (!totpOk) {
        return res.status(401).json({ ok: false, error: 'Invalid 2FA code.' });
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete all user data from all tables
      await client.query('DELETE FROM calorie_entries WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM weight_entries WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM ai_usage WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM account_links WHERE requester_id = $1 OR target_id = $1', [userId]);
      await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }

    return req.session.destroy(() => {
      return res.json({ ok: true });
    });
  } catch (err) {
    console.error('Account deletion failed', err);
    return res.status(500).json({ ok: false, error: 'Could not delete account. Please try again.' });
  }
});

// Email change routes
router.post('/settings/email/request', strictLimiter, requireLogin, csrfProtection, async (req, res) => {
  const newEmail = (req.body.new_email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const totpCode = req.body.totp_code || '';

  const fail = (message, status) => {
    return res.status(status || 400).json({ ok: false, error: message });
  };

  // Validate email format
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return fail('Please enter a valid email address.');
  }

  // Check if email is the same
  if (newEmail === req.currentUser.email.toLowerCase()) {
    return fail('New email is the same as your current email.');
  }

  // Check if email is already taken
  try {
    const { rows } = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [newEmail]);
    if (rows.length > 0) {
      return fail('This email address is already in use.', 409);
    }
  } catch (err) {
    console.error('Email check error', err);
    return fail('Could not verify email. Please try again.', 500);
  }

  // Verify password
  try {
    const { rows } = await pool.query('SELECT password_hash, totp_enabled, totp_secret FROM users WHERE id = $1', [req.currentUser.id]);
    const user = rows[0];
    if (!user) {
      return fail('User not found.', 404);
    }

    const validPassword = await verifyAndMigratePassword(user.password_hash, password, req.currentUser.id);
    if (!validPassword) {
      return fail('Incorrect password.', 401);
    }

    // Verify TOTP if enabled
    if (user.totp_enabled) {
      if (!totpCode) {
        return fail('Please enter your 2FA code.');
      }
      const totpOk = speakeasy.totp.verify({
        secret: user.totp_secret,
        encoding: 'base32',
        token: totpCode,
        window: 1,
      });
      if (!totpOk) {
        return fail('Invalid 2FA code.', 401);
      }
    }

    // Create token and send verification email
    const code = await createEmailChangeToken(req.currentUser.id, newEmail);
    await sendEmailChangeVerification(newEmail, code);

    // Store pending email in session for the verification page
    req.session.pendingEmailChange = newEmail;
    req.session.pendingEmailChangeCreatedAt = Date.now();
    req.session.emailChangeAttempts = 0;

    return res.json({ ok: true });
  } catch (err) {
    console.error('Email change request error', err);
    return fail('Could not process email change. Please try again.', 500);
  }
});

router.post('/settings/email/verify', requireLogin, csrfProtection, async (req, res) => {
  const pendingEmail = req.session.pendingEmailChange;
  const PENDING_EMAIL_EXPIRY = 30 * 60 * 1000; // 30 minutes
  if (!pendingEmail ||
      (req.session.pendingEmailChangeCreatedAt && Date.now() - req.session.pendingEmailChangeCreatedAt > PENDING_EMAIL_EXPIRY)) {
    delete req.session.pendingEmailChange;
    delete req.session.pendingEmailChangeCreatedAt;
    delete req.session.emailChangeAttempts;
    return res.status(400).json({ ok: false, error: 'Email change request expired. Please start again.' });
  }

  const code = (req.body.code || '').trim();
  if (!code) {
    return res.status(400).json({ ok: false, error: 'Please enter the verification code.' });
  }

  // Rate limit attempts
  req.session.emailChangeAttempts = (req.session.emailChangeAttempts || 0) + 1;
  if (req.session.emailChangeAttempts > 5) {
    delete req.session.pendingEmailChange;
    delete req.session.emailChangeAttempts;
    return res.status(429).json({ ok: false, error: 'Too many failed attempts. Please start over.' });
  }

  try {
    const result = await verifyEmailChangeToken(req.currentUser.id, code);
    if (!result) {
      return res.status(400).json({ ok: false, error: 'Invalid or expired verification code.' });
    }

    // Update the user's email
    await pool.query('UPDATE users SET email = $1 WHERE id = $2', [result.newEmail, req.currentUser.id]);
    await markEmailVerificationUsed(result.tokenId);

    // Clear session state
    delete req.session.pendingEmailChange;
    delete req.session.pendingEmailChangeCreatedAt;
    delete req.session.emailChangeAttempts;

    return res.json({ ok: true });
  } catch (err) {
    console.error('Email change verification error', err);
    return res.status(500).json({ ok: false, error: 'Could not verify code. Please try again.' });
  }
});

router.post('/settings/email/cancel', requireLogin, csrfProtection, (req, res) => {
  delete req.session.pendingEmailChange;
  delete req.session.pendingEmailChangeCreatedAt;
  delete req.session.emailChangeAttempts;
  return res.json({ ok: true });
});

module.exports = router;
