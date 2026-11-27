'use strict';
const getJson = async (url, fetchFn) => {
  const res = await fetchFn(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

/** Look up today's US AQI for a city via Open-Meteo (no API key). Returns null when unavailable. */
async function fetchAir(city, fetchFn = fetch) {
  try {
    const geo = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`, fetchFn);
    const p = geo.results?.[0];
    if (!p) return null;
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${p.latitude}&longitude=${p.longitude}&current=us_aqi,pm2_5`;
    const cur = (await getJson(url, fetchFn)).current;
    if (!Number.isFinite(cur?.us_aqi)) return null;
    return { place: [p.name, p.admin1, p.country].filter(Boolean).join(', '), aqi: Math.round(cur.us_aqi), pm25: cur.pm2_5 ?? null, source: 'Open-Meteo' };
  } catch (e) {
    console.error(`Air lookup failed: ${e.message}`);
    return null;
  }
}

module.exports = { fetchAir };
