const { describe, test, expect, beforeAll } = require('@jest/globals');
const request = require('supertest');
const { createTestApp } = require('./setup');

const entriesRoutes = require('../src/routes/entries');

let app;

beforeAll(() => {
  app = createTestApp(entriesRoutes);
});

describe('Entries — authentication required', () => {
  test('POST /entries returns 401 when unauthenticated', async () => {
    await request(app)
      .post('/entries')
      .send({ amount: '100' })
      .expect(401);
  });

  test('GET /overview returns 401 when unauthenticated', async () => {
    await request(app)
      .get('/overview')
      .expect(401);
  });

  test('GET /entries/day returns 401 when unauthenticated', async () => {
    await request(app)
      .get('/entries/day?date=2024-01-01')
      .expect(401);
  });

  test('GET /settings/export returns 401 when unauthenticated', async () => {
    await request(app)
      .get('/settings/export')
      .expect(401);
  });

  test('POST /settings/import returns 401 when unauthenticated', async () => {
    await request(app)
      .post('/settings/import')
      .expect(401);
  });

});
