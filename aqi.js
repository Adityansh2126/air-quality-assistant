'use strict';

/** US AQI bands: upper bound, label, mask advice and plain-language action. */
const BANDS = [
  { max: 50, level: 'Good', mask: false, action: 'Air is clean. Normal outdoor activity is fine, and it is a good time to ventilate your home.' },
  { max: 100, level: 'Moderate', mask: false, action: 'Acceptable for most people. Unusually sensitive people should shorten long outdoor exertion.' },
  { max: 150, level: 'Unhealthy for sensitive groups', mask: true, action: 'Children, older adults and people with breathing problems should limit time outdoors.' },
  { max: 200, level: 'Unhealthy', mask: true, action: 'Everyone should cut back on outdoor exertion. Wear a well-fitted N95/FFP2 mask outside.' },
  { max: 300, level: 'Very unhealthy', mask: true, action: 'Stay indoors with windows closed, run a purifier if you have one, and avoid outdoor exercise.' },
  { max: Infinity, level: 'Hazardous', mask: true, action: 'Emergency conditions. Stay indoors, seal gaps, and avoid all outdoor activity.' }
];


/**
 * Classify a US AQI value.
 * @param {number} aqi
 * @returns {{band: number, level: string, action: string, mask: boolean}}
 */
function aqiCategory(aqi) {
  const band = BANDS.findIndex(x => aqi <= x.max);
  const { level, action, mask } = BANDS[band];
  return { band, level, action, mask };
}


module.exports = { aqiCategory };
