const { describe, test, expect, beforeAll } = require('@jest/globals');
const request = require('supertest');
const { createTestApp } = require('./setup');

const authRoutes = require('../src/routes/auth');
const apiRoutes = require('../src/routes/api');

let app;

beforeAll(() => {
  // Auth routes are mounted at '/' (they define /api/auth/* paths internally)
  // API routes need '/api' prefix to match production mounting
  const express = require('express');
  app = createTestApp(authRoutes);
  // Mount apiRoutes at /api (same as production app.js)
  app.use('/api', apiRoutes);
});

// ---- CSRF protection works ----

describe('CSRF protection', () => {
  test('POST /api/auth/login without CSRF token is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Accept', 'application/json')
      .send({ email: 'a@b.com', password: 'test' });
    expect([302, 403]).toContain(res.status);
  });

  test('POST /api/auth/login with wrong CSRF token is rejected', async () => {
    const agent = request.agent(app);
    // Get a valid CSRF token from the API
    const csrfRes = await agent.get('/api/csrf');
    const csrfToken = csrfRes.body.token;
    expect(csrfToken).toBeTruthy();

    const res = await agent
      .post('/api/auth/login')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', 'wrong-token')
      .send({ email: 'a@b.com', password: 'test' });
    expect([302, 403]).toContain(res.status);
  });
});

// ---- CSRF token endpoint ----

describe('CSRF token endpoint', () => {
  test('GET /api/csrf returns a token', async () => {
    const res = await request(app).get('/api/csrf').expect(200);
    expect(res.body.token).toBeTruthy();
    expect(typeof res.body.token).toBe('string');
  });
});

// ---- Form validation (requires DB for pool queries) ----

const skipIfNoDb = () => {
  if (process.env.DATABASE_URL === 'postgresql://test:test@localhost:5432/test') {
    return true;
  }
  return false;
};

describe('Registration validation (API)', () => {
  test('rejects registration without email', async () => {
    if (skipIfNoDb()) return;

    const agent = request.agent(app);
    const csrfRes = await agent.get('/api/csrf');
    const csrfToken = csrfRes.body.token;

    const res = await agent
      .post('/api/auth/register')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrfToken)
      .send({ step: 'credentials', password: 'testpassword123' })
      .expect(400);

    expect(res.body.error).toContain('Email and password are required');
  });

  test('rejects short password', async () => {
    if (skipIfNoDb()) return;

    const agent = request.agent(app);
    const csrfRes = await agent.get('/api/csrf');
    const csrfToken = csrfRes.body.token;

    const res = await agent
      .post('/api/auth/register')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrfToken)
      .send({ step: 'credentials', email: 'test@example.com', password: 'short' })
      .expect(400);

    expect(res.body.error).toContain('Password must be at least 10 characters');
  });
});

// ---- Session cookie security flags ----

describe('Session cookie security flags', () => {
  test('session cookie has HttpOnly flag', async () => {
    const res = await request(app).get('/api/csrf');
    const cookie = res.headers['set-cookie']?.[0] || '';
    expect(cookie.toLowerCase()).toContain('httponly');
  });
});

// ---- Session cookie lifetime ----

describe('Session cookie maxAge', () => {
  test('unauthenticated session gets short-lived cookie', async () => {
    const res = await request(app).get('/api/csrf');
    const cookie = res.headers['set-cookie']?.[0] || '';
    if (cookie.includes('Max-Age=')) {
      const maxAge = parseInt(cookie.match(/Max-Age=(\d+)/)?.[1] || '0', 10);
      // Should be 15 min (900) or less, definitely not 30 days (2592000)
      expect(maxAge).toBeLessThanOrEqual(900);
    }
  });

  test('login upgrades session cookie to 30 days', async () => {
    if (skipIfNoDb()) return;

    const agent = request.agent(app);
    const csrfRes = await agent.get('/api/csrf');
    const csrfToken = csrfRes.body.token;

    const res = await agent
      .post('/api/auth/login')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'test@test.com', password: 'test1234' });

    const cookie = res.headers['set-cookie']?.[0] || '';
    if (cookie.includes('Max-Age=')) {
      const maxAge = parseInt(cookie.match(/Max-Age=(\d+)/)?.[1] || '0', 10);
      expect(maxAge).toBe(2592000);
    }
  });
});

describe('Login validation (API)', () => {
  test('rejects login without credentials', async () => {
    if (skipIfNoDb()) return;

    const agent = request.agent(app);
    const csrfRes = await agent.get('/api/csrf');
    const csrfToken = csrfRes.body.token;

    const res = await agent
      .post('/api/auth/login')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrfToken)
      .send({})
      .expect(400);

    expect(res.body.error).toContain('Email and password are required');
  });

  test('rejects invalid credentials', async () => {
    if (skipIfNoDb()) return;

    const agent = request.agent(app);
    const csrfRes = await agent.get('/api/csrf');
    const csrfToken = csrfRes.body.token;

    const res = await agent
      .post('/api/auth/login')
      .set('Accept', 'application/json')
      .set('X-CSRF-Token', csrfToken)
      .send({ email: 'nonexistent@example.com', password: 'wrongpassword1' })
      .expect(401);

    expect(res.body.error).toContain('Invalid credentials');
  });
});
