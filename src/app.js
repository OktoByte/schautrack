require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');

const { pool } = require('./db/pool');
const { attachUser } = require('./middleware/auth');
const { addCsrfToken } = require('./middleware/csrf');
const { errorHandler, notFoundHandler } = require('./middleware/error');
const { rememberClientTimezone } = require('./lib/utils');

// Validate required environment variables
if (!process.env.SESSION_SECRET) {
  console.error('FATAL: SESSION_SECRET environment variable is required');
  process.exit(1);
}

const app = express();

// Trust proxy headers (X-Forwarded-Proto, X-Forwarded-For, etc.)
// Required for secure cookies behind reverse proxy (nginx, Caddy, etc.)
app.set('trust proxy', true);

// Security headers via Helmet (no EJS — React SPA handles all rendering)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      scriptSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow file uploads
}));

app.use(express.static(path.join(__dirname, 'public'), { 
  maxAge: '7d', // Cache static assets for 7 days
  etag: true,
  lastModified: true,
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '10mb' }));

// Dynamic robots.txt based on ROBOTS_INDEX environment variable
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  if (process.env.ROBOTS_INDEX === 'true') {
    const host = req.get('host');
    const protocol = req.protocol;
    res.send(`User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /settings
Disallow: /admin
Disallow: /api/

Sitemap: ${protocol}://${host}/sitemap.xml
`);
  } else {
    res.send(`User-agent: *
Disallow: /
`);
  }
});

// SEO: Sitemap for search engines
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const pages = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/login', priority: '0.8', changefreq: 'monthly' },
    { loc: '/register', priority: '0.8', changefreq: 'monthly' },
    { loc: '/privacy', priority: '0.5', changefreq: 'yearly' },
    { loc: '/terms', priority: '0.5', changefreq: 'yearly' },
    { loc: '/imprint', priority: '0.3', changefreq: 'yearly' }
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${baseUrl}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

// Session middleware
// Default maxAge is short (15 min) so anonymous/bot sessions expire quickly.
// Authenticated sessions get upgraded to 30 days on login (see routes/auth.js).
const SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days
const ANON_MAX_AGE = 1000 * 60 * 15; // 15 minutes

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: 'session',
      pruneSessionInterval: 300, // Clean expired sessions every 5 minutes
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Refresh cookie expiry on every response (inactivity timeout, not absolute)
    cookie: {
      maxAge: ANON_MAX_AGE,
      secure: 'auto', // Uses X-Forwarded-Proto via trust proxy
      sameSite: 'lax',
    },
  })
);

// Rate limiting is handled in individual route modules

// User authentication and CSRF setup
app.use(attachUser);
app.use(addCsrfToken);

// Store detected timezone in cookie for future reference (used for non-authenticated pages)
app.use((req, res, next) => {
  rememberClientTimezone(req, res);
  next();
});

// Mount route modules
const healthRoutes = require('./routes/health');
const legalRoutes = require('./routes/legal');
const authRoutes = require('./routes/auth');
const entriesRoutes = require('./routes/entries');
const { router: sseRouter } = require('./routes/sse');
const weightRoutes = require('./routes/weight');
const aiRoutes = require('./routes/ai');
const linksRoutes = require('./routes/links');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');

const apiRoutes = require('./routes/api');

app.use('/api', healthRoutes);
app.use('/api', apiRoutes);
app.use('/', legalRoutes);
app.use('/', authRoutes);
app.use('/', entriesRoutes);
app.use('/', sseRouter);
app.use('/', weightRoutes);
app.use('/', aiRoutes);
app.use('/', linksRoutes);
app.use('/', adminRoutes);
app.use('/', settingsRoutes);

// SPA fallback - serve index.html for non-API routes in production
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
const fs = require('fs');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath, { maxAge: '7d', etag: true, lastModified: true }));
  app.get('*', (req, res, next) => {
    // Don't serve SPA for API routes or SSE
    if (req.path.startsWith('/api/') || req.path.startsWith('/events/')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);
app.use(notFoundHandler);

module.exports = app;