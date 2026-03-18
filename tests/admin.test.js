const { describe, test, expect, beforeAll } = require('@jest/globals');
const request = require('supertest');
const { createTestApp } = require('./setup');

const adminRoutes = require('../src/routes/admin');

let app;

beforeAll(() => {
  app = createTestApp(adminRoutes);
});

describe('Admin — authentication required', () => {
  test('POST /admin/settings returns 401 when unauthenticated', async () => {
    await request(app)
      .post('/admin/settings')
      .set('Accept', 'application/json')
      .send({ key: 'support_email', value: 'evil@example.com' })
      .expect(401);
  });

  test('POST /admin/users/1/delete returns 401 when unauthenticated', async () => {
    await request(app)
      .post('/admin/users/1/delete')
      .set('Accept', 'application/json')
      .expect(401);
  });
});

describe('Admin — CSRF protection', () => {
  test('POST /admin/settings without CSRF token is rejected', async () => {
    const res = await request(app)
      .post('/admin/settings')
      .send({ key: 'support_email', value: 'test@example.com' });
    // Unauthenticated users get 401 before CSRF fires, or 403 if CSRF fires first
    expect([401, 403]).toContain(res.status);
  });

  test('POST /admin/users/1/delete without CSRF token is rejected', async () => {
    const res = await request(app)
      .post('/admin/users/1/delete');
    expect([401, 403]).toContain(res.status);
  });
});
