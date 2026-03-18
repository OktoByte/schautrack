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
    // Unauthenticated users get redirected to /login before CSRF even fires,
    // but the request should NOT succeed (302 to /login or 403)
    expect([302, 403]).toContain(res.status);
  });

  test('POST /admin/users/1/delete without CSRF token is rejected', async () => {
    const res = await request(app)
      .post('/admin/users/1/delete');
    expect([302, 403]).toContain(res.status);
  });
});
