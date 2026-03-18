const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const argon2 = require('argon2');
const { pool } = require('../db/pool');
const { requireLogin } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');
const { encryptApiKey } = require('../lib/ai');
const { MACRO_KEYS, parseMacroInput } = require('../lib/macros');
const { broadcastSettingsChange } = require('./sse');

const router = express.Router();

router.post('/settings/preferences', requireLogin, csrfProtection, async (req, res) => {
  const unitRaw = (req.body.weight_unit || '').toLowerCase();
  const weightUnit = ['kg', 'lb'].includes(unitRaw) ? unitRaw : 'kg';

  // Validate timezone against supported IANA timezones
  const timezoneRaw = (req.body.timezone || '').trim();
  const supportedTimezones = Intl.supportedValuesOf('timeZone');
  const timezone = supportedTimezones.includes(timezoneRaw) ? timezoneRaw : null;

  try {
    if (timezone) {
      // Set timezone_manual flag to prevent auto-updates
      await pool.query('UPDATE users SET weight_unit = $1, timezone = $2, timezone_manual = TRUE WHERE id = $3', [weightUnit, timezone, req.currentUser.id]);
    } else {
      await pool.query('UPDATE users SET weight_unit = $1 WHERE id = $2', [weightUnit, req.currentUser.id]);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to update preferences', err);
    return res.status(500).json({ ok: false, error: 'Failed to save preferences' });
  }
});

router.post('/settings/macros', requireLogin, csrfProtection, async (req, res) => {

  // Parse calorie goal (now stored in macro_goals.calories)
  const calorieGoal = parseMacroInput(req.body.calorie_goal);

  // Parse enabled macros, goals, and modes
  const enabledMacros = {};
  const macroGoals = {};

  // Calories enabled state
  enabledMacros.calories = req.body.calories_enabled === 'on' || req.body.calories_enabled === 'true';

  // Calorie goal and mode (stored in macro_goals alongside other macros)
  if (calorieGoal !== null) {
    macroGoals.calories = calorieGoal;
  }
  const calMode = req.body.calories_mode;
  if (calMode === 'limit' || calMode === 'target') {
    macroGoals.calories_mode = calMode;
  }

  for (const key of MACRO_KEYS) {
    enabledMacros[key] = req.body[`${key}_enabled`] === 'on' || req.body[`${key}_enabled`] === 'true';
    // Always store goals regardless of enabled state so they survive disable/re-enable
    const goal = parseMacroInput(req.body[`${key}_goal`]);
    if (goal !== null) {
      macroGoals[key] = goal;
    }
    const mode = req.body[`${key}_mode`];
    if (mode === 'limit' || mode === 'target') {
      macroGoals[`${key}_mode`] = mode;
    }
  }

  // Auto-calculate calories toggle (only valid when calories + protein + carbs + fat are all enabled)
  const wantsAutoCalc = req.body.auto_calc_calories === 'on' || req.body.auto_calc_calories === 'true';
  const canAutoCalc = enabledMacros.calories !== false
    && enabledMacros.protein === true
    && enabledMacros.carbs === true
    && enabledMacros.fat === true;
  enabledMacros.auto_calc_calories = wantsAutoCalc && canAutoCalc;

  // Parse goal threshold (0-99)
  const rawThreshold = parseMacroInput(req.body.goal_threshold);
  const goalThreshold = rawThreshold != null ? Math.min(Math.max(rawThreshold, 0), 99) : 10;

  try {
    await pool.query(
      'UPDATE users SET macros_enabled = $1, macro_goals = $2, goal_threshold = $3 WHERE id = $4',
      [JSON.stringify(enabledMacros), JSON.stringify(macroGoals), goalThreshold, req.currentUser.id]
    );

    // Derive the enabled macro keys list (excluding meta flags)
    const enabledKeys = MACRO_KEYS.filter((k) => enabledMacros[k]);
    const macroModes = {};
    for (const key of ['calories', ...MACRO_KEYS]) {
      if (macroGoals[`${key}_mode`]) macroModes[key] = macroGoals[`${key}_mode`];
    }

    broadcastSettingsChange(req.currentUser.id, {
      enabledMacros: enabledKeys,
      caloriesEnabled: enabledMacros.calories !== false,
      autoCalcCalories: enabledMacros.auto_calc_calories || false,
      macroGoals,
      macroModes,
      goalThreshold,
      dailyGoal: macroGoals.calories || null,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to save macro preferences', err);
    return res.status(500).json({ ok: false, error: 'Failed to save preferences' });
  }
});

router.post('/settings/ai', requireLogin, csrfProtection, async (req, res) => {
  const { ai_key, ai_provider, ai_model, ai_daily_limit, clear_settings } = req.body;

  if (clear_settings === 'true') {
    try {
      await pool.query('UPDATE users SET ai_key = NULL, ai_endpoint = NULL, ai_model = NULL, ai_daily_limit = NULL, preferred_ai_provider = NULL WHERE id = $1', [req.currentUser.id]);
      return res.json({ ok: true, message: 'AI settings cleared.' });
    } catch (err) {
      console.error('Failed to clear AI settings', err);
      return res.status(500).json({ ok: false, error: 'Could not clear settings.' });
    }
  }

  const updates = [];
  const values = [];
  let idx = 1;

  // AI provider (user-scoped)
  const validProviders = ['openai', 'claude', 'ollama'];
  const newProvider = ai_provider && validProviders.includes(ai_provider) ? ai_provider : null;
  const providerChanged = newProvider !== (req.currentUser.preferred_ai_provider || null);
  updates.push(`preferred_ai_provider = $${idx}`);
  values.push(newProvider);
  idx++;

  // API key (user-scoped) — clear when provider changes and no new key given
  if (ai_key && ai_key.trim()) {
    const encrypted = encryptApiKey(ai_key.trim());
    if (encrypted) {
      updates.push(`ai_key = $${idx}`);
      values.push(encrypted);
      idx++;
    }
  } else if (providerChanged) {
    updates.push(`ai_key = NULL`);
  }

  // Model (user-scoped, sanitize)
  const modelVal = (ai_model || '').trim().slice(0, 100);
  updates.push(`ai_model = $${idx}`);
  values.push(modelVal || null);
  idx++;

  // Daily limit (user-scoped)
  const limitVal = parseInt(ai_daily_limit, 10);
  updates.push(`ai_daily_limit = $${idx}`);
  values.push(!Number.isNaN(limitVal) && limitVal > 0 ? limitVal : null);
  idx++;

  // Endpoint is admin-only (global setting) — never accept user override
  updates.push(`ai_endpoint = NULL`);

  try {
    if (updates.length > 0) {
      values.push(req.currentUser.id);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, values);
    }
    return res.json({ ok: true, message: 'AI settings saved.' });
  } catch (err) {
    console.error('Failed to save AI settings', err);
    return res.status(500).json({ ok: false, error: 'Could not save settings.' });
  }
});

router.post('/settings/password', requireLogin, csrfProtection, async (req, res) => {
  const currentPassword = req.body.current_password || '';
  const newPassword = req.body.new_password || '';
  const confirmPassword = req.body.confirm_password || '';

  const fail = (message, status) => {
    return res.status(status || 400).json({ ok: false, error: message });
  };

  if (!currentPassword || !newPassword) {
    return fail('Current and new password are required.');
  }

  if (newPassword !== confirmPassword) {
    return fail('New passwords do not match.');
  }

  if (newPassword.length < 10) {
    return fail('New password must be at least 10 characters.');
  }

  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.currentUser.id]);
    const user = rows[0];
    if (!user) {
      return fail('User not found.', 404);
    }

    const validPassword = await argon2.verify(user.password_hash, currentPassword);
    if (!validPassword) {
      return fail('Current password is incorrect.', 401);
    }

    if (req.currentUser.totp_enabled) {
      const totpCode = req.body.totp_code || '';
      if (!totpCode) {
        return fail('Please enter your 2FA code.');
      }
      const totpOk = speakeasy.totp.verify({
        secret: req.currentUser.totp_secret,
        encoding: 'base32',
        token: totpCode,
        window: 1,
      });
      if (!totpOk) {
        return fail('Invalid 2FA code.', 401);
      }
    }

    const hash = await argon2.hash(newPassword);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.currentUser.id]);

    return res.json({ ok: true });
  } catch (err) {
    console.error('Password change error', err);
    return res.status(500).json({ ok: false, error: 'Could not change password. Please try again.' });
  }
});

// 2FA routes
router.post('/2fa/setup', requireLogin, csrfProtection, async (req, res) => {
  const user = req.currentUser;
  const secret = speakeasy.generateSecret({
    name: `Schautrack (${user.email})`,
  });

  req.session.tempSecret = secret.base32;
  req.session.tempUrl = secret.otpauth_url;
  req.session.tempSecretCreatedAt = Date.now();

  let qrDataUrl = null;
  try {
    qrDataUrl = await QRCode.toDataURL(secret.otpauth_url);
  } catch (err) {
    console.error('QR generation error', err);
  }
  return res.json({ ok: true, qrDataUrl, secret: secret.base32, otpauthUrl: secret.otpauth_url });
});

router.post('/2fa/cancel', requireLogin, csrfProtection, (req, res) => {
  delete req.session.tempSecret;
  delete req.session.tempUrl;
  delete req.session.tempSecretCreatedAt;
  return res.json({ ok: true });
});

router.post('/2fa/enable', requireLogin, csrfProtection, async (req, res) => {
  const { token } = req.body;
  const secret = req.session.tempSecret;

  if (!secret) {
    return res.status(400).json({ ok: false, error: 'No 2FA setup in progress.' });
  }

  const ok = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });

  if (!ok) {
    return res.status(401).json({ ok: false, error: 'Invalid 2FA code.' });
  }

  try {
    await pool.query('UPDATE users SET totp_secret = $1, totp_enabled = TRUE WHERE id = $2', [
      secret,
      req.currentUser.id,
    ]);
    delete req.session.tempSecret;
    delete req.session.tempUrl;
    delete req.session.tempSecretCreatedAt;
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to enable 2FA', err);
    return res.status(500).json({ ok: false, error: 'Failed to enable 2FA.' });
  }
});

router.post('/2fa/disable', requireLogin, csrfProtection, async (req, res) => {
  const { token } = req.body;
  const user = req.currentUser;

  if (!user.totp_enabled || !user.totp_secret) {
    return res.status(400).json({ ok: false, error: '2FA is not enabled.' });
  }

  const ok = speakeasy.totp.verify({
    secret: user.totp_secret,
    encoding: 'base32',
    token,
    window: 1,
  });

  if (!ok) {
    return res.status(401).json({ ok: false, error: 'Invalid 2FA code.' });
  }

  try {
    await pool.query('UPDATE users SET totp_secret = NULL, totp_enabled = FALSE WHERE id = $1', [user.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to disable 2FA', err);
    return res.status(500).json({ ok: false, error: 'Failed to disable 2FA.' });
  }
});

module.exports = router;
