'use strict';

const HEADERS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

/** Set security headers on every response and disable caching for API routes. */
function securityHeaders(req, res, next) {
  res.set(HEADERS);
  if (req.path.startsWith('/api')) res.set('Cache-Control', 'no-store');
  next();
}

/** Return JSON errors (malformed JSON, oversized bodies) instead of HTML error pages. */
function jsonErrorHandler(err, _req, res, _next) {
  res.status(err.status || 500).json({ error: 'Invalid request.' });
}

module.exports = { securityHeaders, jsonErrorHandler };
