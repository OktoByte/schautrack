const express = require('express');
const { pool, setAdminSetting } = require('../db/pool');
const { requireLogin, requireAdmin } = require('../middleware/auth');
const { csrfProtection } = require('../middleware/csrf');

const router = express.Router();

router.post('/admin/settings', requireLogin, requireAdmin, csrfProtection, async (req, res) => {
  const { key, value } = req.body;

  const allowedKeys = {
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

  if (!allowedKeys[key]) {
    return res.status(400).json({ ok: false, error: 'Invalid setting key.' });
  }

  const envValue = process.env[allowedKeys[key]];
  if (envValue !== undefined && envValue !== null && envValue !== '') {
    return res.status(400).json({ ok: false, error: 'This setting is controlled by environment variable.' });
  }

  try {
    await setAdminSetting(key, value);
    return res.json({ ok: true, message: 'Setting updated.' });
  } catch (err) {
    console.error('Failed to update admin setting', err);
    return res.status(500).json({ ok: false, error: 'Failed to update setting.' });
  }
});

router.post('/admin/users/:id/delete', requireLogin, requireAdmin, csrfProtection, async (req, res) => {
  const userId = parseInt(req.params.id, 10);

  if (Number.isNaN(userId)) {
    return res.status(400).json({ ok: false, error: 'Invalid user ID.' });
  }

  if (userId === req.currentUser.id) {
    return res.status(400).json({ ok: false, error: 'Cannot delete yourself.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete all user data from all tables (admin deletion)
    await client.query('DELETE FROM calorie_entries WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM weight_entries WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM ai_usage WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM account_links WHERE requester_id = $1 OR target_id = $1', [userId]);
    await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    // Clean up any active sessions for the deleted user
    await client.query(`DELETE FROM "session" WHERE (sess::jsonb->>'userId')::int = $1`, [userId]);

    await client.query('COMMIT');
    return res.json({ ok: true, message: 'User deleted completely.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Failed to delete user', err);
    return res.status(500).json({ ok: false, error: 'Failed to delete user.' });
  } finally {
    client.release();
  }
});

module.exports = router;