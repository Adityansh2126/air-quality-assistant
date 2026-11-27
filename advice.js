'use strict';
const { truncate } = require('./text');

/** Sanitise model output so the UI only ever receives bounded plain strings. */
function clean(raw) {
  const arr = (a, n) => (Array.isArray(a) ? a.slice(0, n) : []);
  return {
    summary: truncate(raw.summary, 400),
    routines: arr(raw.routines, 8).map(x => ({ when: truncate(x?.when, 40), tip: truncate(x?.tip, 220) })).filter(x => x.tip),
    indoor: arr(raw.indoor, 8).map(x => truncate(x, 220)).filter(Boolean),
    alternatives: arr(raw.alternatives, 6).map(x => ({ swap: truncate(x?.swap, 100), benefit: truncate(x?.benefit, 220) })).filter(x => x.swap)
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


module.exports = { clean, fallback };
