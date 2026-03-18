const express = require('express');
const { pool } = require('../db/pool');
const { requireLogin, requireAdmin, isAdmin } = require('../middleware/auth');
const { generateCsrfToken } = require('../middleware/csrf');

const router = express.Router();

// GET /api/csrf - Returns a CSRF token for the SPA to use
router.get('/csrf', (req, res) => {
  const token = generateCsrfToken(req);
  res.json({ token });
});

// GET /api/me - Returns current user profile or 401
router.get('/me', (req, res) => {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = req.currentUser;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      timezone: user.timezone || 'UTC',
      weightUnit: user.weight_unit || 'kg',
      dailyGoal: user.daily_goal,
      totpEnabled: user.totp_enabled || false,
      macrosEnabled: user.macros_enabled || {},
      macroGoals: user.macro_goals || {},
      goalThreshold: user.goal_threshold != null ? user.goal_threshold : 10,
      preferredAiProvider: user.preferred_ai_provider || null,
      hasAiKey: Boolean(user.ai_key),
      aiModel: user.ai_model || null,
      aiDailyLimit: user.ai_daily_limit || null,
    },
    isAdmin: isAdmin(user),
  });
});

// GET /api/settings - Returns settings page data
router.get('/settings', requireLogin, async (req, res) => {
  const { getLinkRequests, getAcceptedLinkUsers } = require('../lib/links');
  const { decryptApiKey } = require('../lib/ai');
  const user = req.currentUser;

  let linkState = { incoming: [], outgoing: [] };
  let acceptedLinks = [];
  try {
    linkState = await getLinkRequests(user.id);
    acceptedLinks = await getAcceptedLinkUsers(user.id);
  } catch (err) {
    console.error('Failed to load link state', err);
  }

  const hasAiKey = Boolean(user.ai_key);
  let aiKeyLast4 = '';
  if (hasAiKey) {
    const decrypted = decryptApiKey(user.ai_key);
    if (decrypted && decrypted.length >= 4) {
      aiKeyLast4 = decrypted.slice(-4);
    }
  }

  const hasTempSecret = Boolean(req.session.tempSecret);

  // Check if temp secret has expired (10 minutes)
  const TOTP_SETUP_EXPIRY = 10 * 60 * 1000;
  if (req.session.tempSecretCreatedAt && Date.now() - req.session.tempSecretCreatedAt > TOTP_SETUP_EXPIRY) {
    delete req.session.tempSecret;
    delete req.session.tempUrl;
    delete req.session.tempSecretCreatedAt;
  }

  const timezones = Intl.supportedValuesOf('timeZone');
  const MAX_LINKS = 3;

  res.json({
    user: {
      id: user.id,
      email: user.email,
      timezone: user.timezone || 'UTC',
      weightUnit: user.weight_unit || 'kg',
      totpEnabled: user.totp_enabled || false,
      macrosEnabled: user.macros_enabled || {},
      macroGoals: user.macro_goals || {},
      goalThreshold: user.goal_threshold != null ? user.goal_threshold : 10,
      preferredAiProvider: user.preferred_ai_provider || null,
      hasAiKey,
      aiKeyLast4,
      aiModel: user.ai_model || null,
      aiDailyLimit: user.ai_daily_limit || null,
    },
    hasTempSecret,
    incomingRequests: linkState.incoming,
    outgoingRequests: linkState.outgoing,
    acceptedLinks,
    maxLinks: MAX_LINKS,
    availableSlots: Math.max(0, MAX_LINKS - acceptedLinks.length),
    timezones,
    // Include any pending feedback from session
    linkFeedback: req.session.linkFeedback || null,
    passwordFeedback: req.session.passwordFeedback || null,
    aiFeedback: req.session.aiFeedback || null,
    emailFeedback: req.session.emailFeedback || null,
    importFeedback: req.session.importFeedback || null,
  });
  // Clear feedback after sending
  delete req.session.linkFeedback;
  delete req.session.passwordFeedback;
  delete req.session.aiFeedback;
  delete req.session.emailFeedback;
  delete req.session.importFeedback;
});

// GET /api/admin - Returns admin page data
router.get('/admin', requireLogin, requireAdmin, async (req, res) => {
  const { getEffectiveSetting } = require('../db/pool');

  const { rows: users } = await pool.query(
    'SELECT id, email, email_verified, created_at FROM users ORDER BY created_at DESC'
  );

  const settingKeys = ['support_email', 'imprint_address', 'imprint_email', 'enable_legal', 'ai_provider', 'ai_key', 'ai_endpoint', 'ai_model', 'ai_daily_limit'];
  const envMap = {
    support_email: 'SUPPORT_EMAIL',
    imprint_address: 'IMPRINT_ADDRESS',
    imprint_email: 'IMPRINT_EMAIL',
    enable_legal: 'ENABLE_LEGAL',
    ai_provider: 'AI_PROVIDER',
    ai_key: 'AI_KEY',
    ai_endpoint: 'AI_ENDPOINT',
    ai_model: 'AI_MODEL',
    ai_daily_limit: 'AI_DAILY_LIMIT',
  };

  const settings = {};
  for (const key of settingKeys) {
    const envVar = envMap[key];
    const effective = await getEffectiveSetting(key, process.env[envVar]);
    settings[key] = {
      value: effective.value || '',
      source: effective.source,
    };
  }

  res.json({ users, settings });
});

module.exports = router;
