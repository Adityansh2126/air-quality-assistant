'use strict';
const { limits } = require('./config');

const HOUSEHOLDS = ['adults', 'children', 'elderly', 'breathing'];
// Typical emission factors in kg CO2 per passenger-km (rounded estimates)
const FACTORS = { car: 0.17, twowheeler: 0.07, bus: 0.09, metro: 0.04, bike: 0, walk: 0, remote: 0 };
const MODES = Object.keys(FACTORS);
const BANDS = [
  { max: 50, level: 'Good', mask: false, action: 'Air is clean. Normal outdoor activity is fine, and it is a good time to ventilate your home.' },
  { max: 100, level: 'Moderate', mask: false, action: 'Acceptable for most people. Unusually sensitive people should shorten long outdoor exertion.' },
  { max: 150, level: 'Unhealthy for sensitive groups', mask: true, action: 'Children, older adults and people with breathing problems should limit time outdoors.' },
  { max: 200, level: 'Unhealthy', mask: true, action: 'Everyone should cut back on outdoor exertion. Wear a well-fitted N95/FFP2 mask outside.' },
  { max: 300, level: 'Very unhealthy', mask: true, action: 'Stay indoors with windows closed, run a purifier if you have one, and avoid outdoor exercise.' },
  { max: Infinity, level: 'Hazardous', mask: true, action: 'Emergency conditions. Stay indoors, seal gaps, and avoid all outdoor activity.' }
];

const round1 = n => Math.round(n * 10) / 10;
const plainText = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const str = (x, n) => String(x ?? '').slice(0, n);

/** Validate and normalise the request body. Returns { errors, value }. */
function validate(input) {
  const b = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const errors = {};
  const city = plainText(b.city, limits.maxCity);
  if (city.length < 2) errors.city = 'Enter your city.';
  const household = String(b.household || '');
  if (!HOUSEHOLDS.includes(household)) errors.household = 'Choose who needs the most protection.';
  const commute = String(b.commute || '');
  if (!MODES.includes(commute)) errors.commute = 'Choose how you usually travel.';
  const commuteKm = Number(b.commuteKm === undefined || b.commuteKm === '' ? 0 : b.commuteKm);
  if (!Number.isFinite(commuteKm) || commuteKm < 0 || commuteKm > limits.maxKm) errors.commuteKm = `Enter a one-way distance from 0 to ${limits.maxKm} km.`;
  const hasManual = b.manualAqi !== undefined && b.manualAqi !== null && b.manualAqi !== '';
  const manualAqi = hasManual ? Number(b.manualAqi) : null;
  if (hasManual && (!Number.isInteger(manualAqi) || manualAqi < 0 || manualAqi > limits.maxAqi)) errors.manualAqi = `AQI must be a whole number from 0 to ${limits.maxAqi}.`;
  const purifier = b.purifier === true || b.purifier === 'on' || b.purifier === 'true';
  const notes = plainText(b.notes, limits.maxNotes);
  return { errors, value: { city, household, commute, commuteKm, manualAqi, purifier, notes } };
}

function aqiCategory(aqi) {
  const band = BANDS.findIndex(x => aqi <= x.max);
  const { level, action, mask } = BANDS[band];
  return { band, level, action, mask };
}

/** Weekly commute emissions (5 round trips) and what switching to metro/rail would save. */
function impact({ commute, commuteKm }) {
  const weeklyKm = round1(commuteKm * 2 * 5);
  const weeklyKg = round1(weeklyKm * FACTORS[commute]);
  let swap = null;
  if (weeklyKm > 0 && FACTORS[commute] > FACTORS.metro) {
    const saved = round1(weeklyKm * (FACTORS[commute] - FACTORS.metro));
    swap = { to: 'metro or rail', weeklyKgSaved: saved, yearlyKgSaved: round1(saved * 50) };
  }
  return { weeklyKm, weeklyKg, swap, note: 'Estimates use typical emission factors (car 0.17, two-wheeler 0.07, bus 0.09, metro 0.04 kg CO2 per km).' };
}

/** Sanitise model output so the UI only ever receives bounded plain strings. */
function clean(raw) {
  const arr = (a, n) => (Array.isArray(a) ? a.slice(0, n) : []);
  return {
    summary: str(raw.summary, 400),
    routines: arr(raw.routines, 8).map(x => ({ when: str(x?.when, 40), tip: str(x?.tip, 220) })).filter(x => x.tip),
    indoor: arr(raw.indoor, 8).map(x => str(x, 220)).filter(Boolean),
    alternatives: arr(raw.alternatives, 6).map(x => ({ swap: str(x?.swap, 100), benefit: str(x?.benefit, 220) })).filter(x => x.swap)
  };
}

/** Rule-based advice used when the AI is unavailable. */
function fallback(v, air, cat) {
  const bad = cat.band >= 2;
  return clean({
    summary: `AQI in ${air.place} is ${air.aqi} (${cat.level}). ${cat.action}`,
    routines: [
      { when: 'Morning', tip: bad ? 'Skip outdoor exercise before late morning, when smog is usually thickest.' : 'Ventilate rooms for 10 minutes while the air is cleanest.' },
      { when: 'Commute', tip: bad ? 'Wear an N95/FFP2 mask and choose routes away from heavy traffic.' : 'Walk, cycle or take public transit for short trips.' },
      { when: 'Evening', tip: 'Cook with the exhaust fan on and avoid burning waste, incense or wood indoors.' }
    ],
    indoor: [v.purifier ? 'Run your purifier in the room you use most, with doors closed.' : 'Keep windows closed on high-AQI days and seal door gaps with draught strips.',
      'Damp-mop floors instead of dry sweeping to keep dust down.', 'Add leafy indoor plants for comfort, but do not rely on them to clean the air.'],
    alternatives: [{ swap: 'Short car trips to walking or cycling', benefit: 'Cuts tailpipe emissions on your street and your own time in traffic.' },
      { swap: 'Car-pool or take metro/bus', benefit: 'Each shared trip removes vehicles that add to local PM2.5.' }]
  });
}

module.exports = { validate, aqiCategory, impact, clean, fallback, HOUSEHOLDS, MODES };
