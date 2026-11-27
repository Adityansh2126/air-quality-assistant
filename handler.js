'use strict';
const { validate, aqiCategory, impact, fallback } = require('./planner');

const NO_AIR_MESSAGE = "We couldn't find live air data for that city. Enter today's AQI to continue.";

/**
 * Build the POST /api/advice handler.
 * Flow: validate, resolve AQI (live or manual), serve from cache or ask the AI, fall back to rules.
 */
function createAdviceHandler({ generate, getAir, cache }) {
  return async (req, res) => {
    const { errors, value } = validate(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    const manual = value.manualAqi !== null ? { place: value.city, aqi: value.manualAqi, pm25: null, source: 'entered by you' } : null;
    const air = (await getAir(value.city)) ?? manual;
    if (!air) return res.status(422).json({ needsAqi: true, error: NO_AIR_MESSAGE });

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
    return res.json(body);
  };
}

module.exports = { createAdviceHandler };
