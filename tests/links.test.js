const { describe, test, expect, beforeAll } = require('@jest/globals');
const request = require('supertest');
const { createTestApp } = require('./setup');

const linksRoutes = require('../src/routes/links');

let app;

beforeAll(() => {
  app = createTestApp(linksRoutes);
});

describe('Account Linking — authentication required', () => {
  test('POST /settings/link/request returns 401 when unauthenticated', async () => {
    await request(app)
      .post('/settings/link/request')
      .send({ email: 'other@example.com' })
      .expect(401);
  });

  test('POST /settings/link/respond returns 401 when unauthenticated', async () => {
    await request(app)
      .post('/settings/link/respond')
      .send({ request_id: '1', action: 'accept' })
      .expect(401);
  });

  test('POST /settings/link/remove returns 401 when unauthenticated', async () => {
    await request(app)
      .post('/settings/link/remove')
      .send({ link_id: '1' })
      .expect(401);
  });

  test('POST /links/:id/label returns 401 when unauthenticated', async () => {
    await request(app)
      .post('/links/1/label')
      .send({ label: 'Family' })
      .expect(401);
  });
});
