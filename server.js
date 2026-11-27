'use strict';
const express = require('express');
const compression = require('compression');
const path = require('path');
const config = require('./config');
const { generate: defaultGenerate } = require('./gemini');
const { fetchAir } = require('./air');
const { TtlCache, createLimiter } = require('./utils');
const { securityHeaders, jsonErrorHandler } = require('./middleware');
const { createAdviceHandler } = require('./handler');

/** Build the Express app. Dependencies are injectable so tests can run offline. */
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
  app.post('/api/advice', limiter, createAdviceHandler({ generate, getAir, cache }));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use(jsonErrorHandler);
  return app;
}

if (require.main === module) {
  createApp().listen(config.port, () => console.log(`Air quality assistant on :${config.port}`));
}
module.exports = { createApp };
