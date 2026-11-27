# Clear Air: Urban Air Quality Assistant

PromptWars Virtual, Challenge 6. A GenAI assistant that helps families and communities cope with winter smog: it looks up today's AQI for your city, then suggests low-emission daily routines, indoor air quality hacks and sustainable swaps tailored to your household and commute, and explains the impact of each choice.

## Run
```bash
npm install
cp .env.example .env   # add GEMINI_API_KEY from aistudio.google.com
npm start              # http://localhost:8080
npm test
```
Without a key, or if Gemini is busy, the app falls back to rule-based advice, so it never breaks.

## How it works
- `server.js`: Express app factory wiring middleware and routes (dependencies injectable for tests)
- `handler.js`: the `/api/advice` flow: validate, resolve AQI, cache, AI, rule-based fallback
- `middleware.js`: security headers and JSON error handling
- `air.js`: live US AQI and PM2.5 from Open-Meteo (no key); the user can enter the AQI if a city is not found
- `gemini.js`: Gemini client with timeout, one retry on 429/500/503, and a fallback model
- `validation.js`, `aqi.js`, `impact.js`, `advice.js`: input validation, AQI bands, commute CO2 estimates, output sanitising and rule-based advice (re-exported by `planner.js`)
- `utils.js`, `text.js`, `config.js`: TTL cache, bounded rate limiter, text helpers, settings
- `public/render.js` builds the results view; `public/app.js` handles the form

## Quality checks
`npm run check` runs ESLint and the test suite (offline, AI and network stubbed).

## Security
API key stays server-side; strict CSP, HSTS and related headers; server-side validation and length caps; control characters stripped; per-IP rate limit with a bounded client table; model output length-clamped and rendered with `textContent`; user notes passed to the model as data, not instructions; upstream error bodies never logged or returned.

## Impact estimates
Commute emissions use typical factors (car 0.17, two-wheeler 0.07, bus 0.09, metro 0.04 kg CO2 per km) and are labelled as estimates. AQI guidance is general information, not medical advice.
