const test = require('node:test');
const assert = require('node:assert');
const { validate, aqiCategory, impact, clean, fallback } = require('../planner');

const ok = { city: 'Delhi', household: 'children', commute: 'car', commuteKm: 10 };

test('valid input passes and text is cleaned', () => {
  const { errors, value } = validate({ ...ok, city: ' Del\u0000hi ', notes: 'x'.repeat(500), purifier: 'on' });
  assert.deepStrictEqual(errors, {});
  assert.strictEqual(value.city, 'Del hi');
  assert.strictEqual(value.notes.length, 200);
  assert.strictEqual(value.purifier, true);
  assert.strictEqual(value.manualAqi, null);
});

test('invalid input reports every bad field', () => {
  const { errors } = validate({ city: '', household: 'x', commute: 'jet', commuteKm: -1, manualAqi: 900 });
  assert.deepStrictEqual(Object.keys(errors).sort(), ['city', 'commute', 'commuteKm', 'household', 'manualAqi']);
});

test('non-object bodies are rejected without throwing', () => {
  for (const body of [null, [], 'text', 5]) assert.ok(validate(body).errors.city);
});

test('AQI categories follow the US AQI bands', () => {
  assert.strictEqual(aqiCategory(50).level, 'Good');
  assert.strictEqual(aqiCategory(51).level, 'Moderate');
  assert.strictEqual(aqiCategory(180).level, 'Unhealthy');
  assert.strictEqual(aqiCategory(450).level, 'Hazardous');
  assert.strictEqual(aqiCategory(180).mask, true);
});

test('commute impact: car vs zero-emission modes', () => {
  const car = impact({ commute: 'car', commuteKm: 10 });
  assert.strictEqual(car.weeklyKm, 100);
  assert.strictEqual(car.weeklyKg, 17);
  assert.strictEqual(car.swap.weeklyKgSaved, 13);
  assert.strictEqual(impact({ commute: 'walk', commuteKm: 10 }).swap, null);
  assert.strictEqual(impact({ commute: 'car', commuteKm: 0 }).weeklyKg, 0);
});

test('clean tolerates garbage model output', () => {
  const out = clean({ routines: 'x', indoor: [1, ''], alternatives: [null, { swap: 's' }] });
  assert.deepStrictEqual(out.routines, []);
  assert.deepStrictEqual(out.indoor, ['1']);
  assert.strictEqual(out.alternatives.length, 1);
});

test('fallback advice reflects the AQI severity', () => {
  const air = { place: 'Delhi', aqi: 220 };
  const bad = fallback({ purifier: true }, air, aqiCategory(220));
  const good = fallback({ purifier: false }, { place: 'Delhi', aqi: 30 }, aqiCategory(30));
  assert.match(bad.routines[0].tip, /Skip outdoor exercise/);
  assert.match(good.routines[0].tip, /Ventilate/);
  assert.match(bad.indoor[0], /purifier/);
});
