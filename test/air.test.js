const test = require('node:test');
const assert = require('node:assert');
const { fetchAir } = require('../air');

const json = body => ({ ok: true, status: 200, json: async () => body });
const geo = json({ results: [{ name: 'Delhi', admin1: 'Delhi', country: 'India', latitude: 28.6, longitude: 77.2 }] });

test('returns place and AQI from the two lookups', async () => {
  const urls = [];
  const fetchFn = async url => { urls.push(url); return urls.length === 1 ? geo : json({ current: { us_aqi: 183.4, pm2_5: 96 } }); };
  const air = await fetchAir('Delhi', fetchFn);
  assert.deepStrictEqual(air, { place: 'Delhi, Delhi, India', aqi: 183, pm25: 96, source: 'Open-Meteo' });
  assert.match(urls[1], /latitude=28\.6&longitude=77\.2/);
});

test('returns null for unknown cities, bad data and network errors', async () => {
  assert.strictEqual(await fetchAir('Nowhere', async () => json({})), null);
  const noAqi = async url => (url.includes('geocoding') ? geo : json({ current: {} }));
  assert.strictEqual(await fetchAir('Delhi', noAqi), null);
  assert.strictEqual(await fetchAir('Delhi', async () => { throw new Error('offline'); }), null);
});
