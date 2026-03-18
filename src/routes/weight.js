const express = require('express');
const { pool } = require('../db/pool');
const { requireLogin } = require('../middleware/auth');
const { requireLinkAuth } = require('../middleware/links');
const { csrfProtection } = require('../middleware/csrf');
const { parseWeight, getUserTimezone, formatDateInTz } = require('../lib/utils');
const { upsertWeightEntry, getWeightEntry, getLastWeightEntry } = require('../lib/weight');

const router = express.Router();

const MAX_HISTORY_DAYS = 180;

router.get('/weight/day', requireLogin, requireLinkAuth, async (req, res) => {
  const dateStr = (req.query.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return res.status(400).json({ ok: false, error: 'Invalid date' });
  }

  // Use values set by requireLinkAuth middleware
  const targetUserId = req.targetUserId;
  const targetUser = req.targetUser;

  // Use target user's timezone for linked users, viewer's timezone for self
  const tz = targetUserId === req.currentUser.id
    ? getUserTimezone(req, res)
    : (targetUser?.timezone || 'UTC');

  const today = new Date();
  const oldest = new Date(today);
  oldest.setDate(today.getDate() - (MAX_HISTORY_DAYS - 1));
  const oldestStr = formatDateInTz(oldest, tz);
  const todayStr = formatDateInTz(today, tz);

  if (dateStr < oldestStr || dateStr > todayStr) {
    return res.status(400).json({ ok: false, error: 'Date outside supported range' });
  }

  try {
    const entry = await getWeightEntry(targetUserId, dateStr);
    const lastWeight = await getLastWeightEntry(targetUserId, dateStr);
    return res.json({ ok: true, entry, lastWeight });
  } catch (err) {
    console.error('Failed to fetch weight entry', err);
    return res.status(500).json({ ok: false, error: 'Could not load weight' });
  }
});

router.post('/weight/upsert', requireLogin, csrfProtection, async (req, res) => {
  const userTz = getUserTimezone(req, res);
  const dateStr = (req.body.entry_date || req.body.date || '').trim() || formatDateInTz(new Date(), userTz);
  const { ok, value: weight } = parseWeight(req.body.weight);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return res.status(400).json({ ok: false, error: 'Invalid date' });
  }

  if (!ok || weight === null) {
    return res.status(400).json({ ok: false, error: 'Invalid weight' });
  }

  const today = new Date();
  const oldest = new Date(today);
  oldest.setDate(today.getDate() - (MAX_HISTORY_DAYS - 1));
  const oldestStr = formatDateInTz(oldest, userTz);
  const todayStr = formatDateInTz(today, userTz);
  if (dateStr < oldestStr || dateStr > todayStr) {
    return res.status(400).json({ ok: false, error: 'Date outside supported range' });
  }

  try {
    const entry = await upsertWeightEntry(req.currentUser.id, dateStr, weight);
    return res.json({ ok: true, entry });
  } catch (err) {
    console.error('Failed to upsert weight entry', err);
    return res.status(500).json({ ok: false, error: 'Could not save weight' });
  }
});

router.post('/weight/:id/delete', requireLogin, csrfProtection, async (req, res) => {
  const weightId = parseInt(req.params.id, 10);
  if (Number.isNaN(weightId)) {
    return res.status(400).json({ ok: false });
  }

  try {
    await pool.query('DELETE FROM weight_entries WHERE id = $1 AND user_id = $2', [
      weightId,
      req.currentUser.id,
    ]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete weight entry', err);
    return res.status(500).json({ ok: false });
  }
});

module.exports = router;
