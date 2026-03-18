// Set env vars BEFORE any app modules are imported.
// pg.Pool is lazy — it won't actually connect until a query is made.
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.SESSION_SECRET = 'test-session-secret-long-enough-for-testing';

const path = require('path');
const express = require('express');
const session = require('express-session');

const { attachUser } = require('../src/middleware/auth');
const { addCsrfToken } = require('../src/middleware/csrf');

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------
// Builds an Express app with the same middleware stack as production but
// uses MemoryStore for sessions (no PgSession) and stubs the settings
// middleware.  Routes still import pool.js but no queries fire unless a
// test actually hits a DB-dependent path.
// ---------------------------------------------------------------------------

function createTestApp(...routeModules) {
  const app = express();

  app.use(express.static(path.join(__dirname, '..', 'src', 'public')));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json({ limit: '10mb' }));

  // In-memory session store (no PostgreSQL dependency)
  app.use(
    session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false, maxAge: 1000 * 60 * 15 }, // 15 min default (matches production)
    })
  );

  // Production auth middleware (reads from session.userId -> pool query).
  // For unauthenticated tests this just sets currentUser = null.
  // For authenticated tests the session is pre-populated so the DB lookup
  // will be attempted - those tests require DATABASE_URL to point at a real DB.
  app.use(attachUser);

  // Real CSRF middleware - same as production
  app.use(addCsrfToken);

  // Mount requested route modules
  for (const routes of routeModules) {
    app.use('/', routes);
  }

  return app;
}

module.exports = { createTestApp };
