'use strict';
const $ = id => document.getElementById(id);

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function section(title) { const s = el('div'); s.append(el('h2', title)); return s; }
function bullets(items) { const ul = el('ul', null, 'plain'); items.forEach(t => ul.append(el('li', t))); return ul; }

function render(d) {
  const root = $('result'); root.replaceChildren();
  const card = el('div', null, 'aqi'); card.dataset.band = d.category.band;
  card.append(el('span', String(d.air.aqi), 'aqi-num'), el('div', d.category.level, 'aqi-level'),
    el('div', `${d.air.place}${d.air.pm25 != null ? ` · PM2.5 ${d.air.pm25} µg/m³` : ''} · source: ${d.air.source}`, 'note'),
    el('p', d.category.action));
  root.append(card);
  if (d.summary) root.append(el('p', d.summary));
  if (d.source === 'template') root.append(el('p', 'Showing rule-based advice. AI suggestions are unavailable right now.', 'note'));

  const r = section('Low-emission daily routine'), rl = el('ul', null, 'plain');
  d.routines.forEach(x => { const li = el('li'); li.append(el('strong', x.when ? x.when + ': ' : ''), document.createTextNode(x.tip)); rl.append(li); });
  r.append(rl);

  const i = section('Indoor air quality hacks'); i.append(bullets(d.indoor));
  const a = section('Sustainable swaps and their impact'), al = el('ul', null, 'plain');
  d.alternatives.forEach(x => { const li = el('li'); li.append(el('strong', x.swap + ': '), document.createTextNode(x.benefit)); al.append(li); });
  a.append(al);

  const m = section('Your commute impact');
  if (d.impact.weeklyKm > 0) {
    m.append(el('p', `About ${d.impact.weeklyKm} km a week, roughly ${d.impact.weeklyKg} kg of CO₂.`));
    if (d.impact.swap) m.append(el('p', `Switching to ${d.impact.swap.to} could save about ${d.impact.swap.weeklyKgSaved} kg of CO₂ a week (around ${d.impact.swap.yearlyKgSaved} kg a year).`));
  } else m.append(el('p', 'No commute emissions to count. Nice.'));
  m.append(el('p', d.impact.note, 'note'));

  root.append(r, i, a, m, el('p', 'General guidance, not medical advice. If you or a family member have symptoms, talk to a doctor.', 'note'));
  root.focus();
}

$('f').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('err'), go = $('go'); err.textContent = '';
  go.disabled = true; go.textContent = 'Checking the air…';
  try {
    const res = await fetch('/api/advice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    const d = await res.json();
    if (d.needsAqi) $('manual-wrap').hidden = false;
    if (!res.ok) throw new Error(d.errors ? Object.values(d.errors).join(' ') : d.error || 'Something went wrong.');
    render(d);
  } catch (x) { err.textContent = x.message; }
  finally { go.disabled = false; go.textContent = 'Get my air plan'; }
});
