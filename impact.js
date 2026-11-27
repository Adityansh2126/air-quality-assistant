'use strict';

// Typical emission factors in kg CO2 per passenger-km (rounded estimates)
const FACTORS = { car: 0.17, twowheeler: 0.07, bus: 0.09, metro: 0.04, bike: 0, walk: 0, remote: 0 };
const MODES = Object.keys(FACTORS);

const round1 = n => Math.round(n * 10) / 10;

/**
 * Estimate weekly commute emissions (5 round trips) and the saving from switching to metro or rail.
 * @param {{commute: string, commuteKm: number}} v
 */
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


module.exports = { impact, MODES };
