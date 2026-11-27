'use strict';
const express = require('express');
const compression = require('compression');
const path = require('path');
const config = require('./config');
const { validate, aqiCategory, impact, fallback } = require('./planner');
const { generate: defaultGenerate } = require('./gemini');
const { fetchAir } = require('./air');
const { TtlCache, createLimiter } = require('./utils');

const HEADERS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};

function securityHeaders(req, res, next) {
  res.set(HEADERS);
  if (req.path.startsWith('/api')) res.set('Cache-Control', 'no-store');
  next();
}

function createApp({
  generate = defaultGenerate,
  getAir = fetchAir,
  limiter = createLimiter(config.rateLimit.max, config.rateLimit.windowMs, config.rateLimit.maxClients),
  cache = new TtlCache(config.cache.max, config.cache.ttlMs)
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(compression());
  app.use(securityHeaders);
  app.use(express.json({ limit: '10kb', type: 'application/json' }));
  app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

  app.post('/api/advice', limiter, async (req, res) => {
    const { errors, value } = validate(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    const air = (await getAir(value.city)) ?? (value.manualAqi !== null ? { place: value.city, aqi: value.manualAqi, pm25: null, source: 'entered by you' } : null);
    if (!air) return res.status(422).json({ needsAqi: true, error: "We couldn't find live air data for that city. Enter today's AQI to continue." });

    const category = aqiCategory(air.aqi);
    const cacheKey = JSON.stringify([value, air.aqi]);
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    let advice = null;
    try { advice = await generate({ ...value, air, category }); } catch (e) { console.error(e.message); }
    const source = advice && advice.routines.length ? 'gemini' : 'template';
    if (source === 'template') advice = fallback(value, air, category);

    const body = { source, air, category, impact: impact(value), ...advice };
    if (source === 'gemini') cache.set(cacheKey, body);
    res.json(body);
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  // Malformed JSON and oversized bodies get a JSON error instead of an HTML page.
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: 'Invalid request.' }));
  return app;
}

if (require.main === module) {
  createApp().listen(config.port, () => console.log(`Air quality assistant on :${config.port}`));
}
module.exports = { createApp };
