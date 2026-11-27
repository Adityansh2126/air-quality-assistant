const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../server');
const { createLimiter } = require('../utils');

const input = { city: 'Delhi', household: 'children', commute: 'car', commuteKm: 10 };
const air = { place: 'Delhi, India', aqi: 180, pm25: 90, source: 'Open-Meteo' };
const advice = { summary: 'ok', routines: [{ when: 'AM', tip: 'Mask up' }], indoor: ['Seal gaps'], alternatives: [{ swap: 'Metro', benefit: 'Less PM2.5' }] };

async function withServer(opts, fn) {
  const server = createApp({ getAir: async () => air, generate: async () => advice, ...opts }).listen(0);
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections?.(); server.close(); }
}
const post = (base, body, raw) => fetch(`${base}/api/advice`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ?? JSON.stringify(body) });

test('serves the page, health check and security headers', () => withServer({}, async base => {
  const page = await fetch(base);
  assert.strictEqual(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
  assert.strictEqual(page.headers.get('x-content-type-options'), 'nosniff');
  assert.deepStrictEqual(await (await fetch(`${base}/healthz`)).json(), { status: 'ok' });
}));

test('rejects invalid input and malformed JSON with JSON errors', () => withServer({}, async base => {
  const bad = await post(base, { city: '' });
  assert.strictEqual(bad.status, 400);
  assert.ok((await bad.json()).errors.city);
  assert.strictEqual((await post(base, null, '{oops')).status, 400);
  assert.strictEqual((await fetch(`${base}/api/nope`)).status, 404);
}));

test('returns AI advice with the AQI category and commute impact', () => withServer({}, async base => {
  const d = await (await post(base, input)).json();
  assert.strictEqual(d.source, 'gemini');
  assert.strictEqual(d.category.level, 'Unhealthy');
  assert.strictEqual(d.impact.weeklyKg, 17);
  assert.strictEqual(d.air.aqi, 180);
}));

test('asks for a manual AQI when lookup fails, then accepts it', () => withServer({ getAir: async () => null }, async base => {
  const miss = await post(base, input);
  assert.strictEqual(miss.status, 422);
  assert.strictEqual((await miss.json()).needsAqi, true);
  const d = await (await post(base, { ...input, manualAqi: 320 })).json();
  assert.strictEqual(d.category.level, 'Hazardous');
  assert.strictEqual(d.air.source, 'entered by you');
}));

test('falls back to rule-based advice when the AI fails', () => withServer({ generate: async () => { throw new Error('boom'); } }, async base => {
  const d = await (await post(base, input)).json();
  assert.strictEqual(d.source, 'template');
  assert.ok(d.routines.length > 0);
}));

test('identical requests are served from cache', async () => {
  let calls = 0;
  await withServer({ generate: async () => { calls++; return advice; } }, async base => { await post(base, input); await post(base, input); });
  assert.strictEqual(calls, 1);
});

test('rate limiting returns 429', () => withServer({ limiter: createLimiter(2, 60000) }, async base => {
  await post(base, input); await post(base, input);
  assert.strictEqual((await post(base, input)).status, 429);
}));
