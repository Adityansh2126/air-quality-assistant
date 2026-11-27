'use strict';
const { limits } = require('./config');
const { plainText } = require('./text');
const { MODES } = require('./impact');

const HOUSEHOLDS = ['adults', 'children', 'elderly', 'breathing'];

/**
 * Validate and normalise the request body.
 * @param {unknown} input
 * @returns {{errors: Object<string, string>, value: Object}}
 */
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


module.exports = { validate, HOUSEHOLDS };
