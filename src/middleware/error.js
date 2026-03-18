// Centralized error handling middleware
const errorHandler = (err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ ok: false, error: 'Internal server error' });
};

// 404 handler for unmatched API routes
const notFoundHandler = (req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
