# oraculo-motor

A **deterministic astrology calculation engine** exposed as a small HTTP API. Given a date, it computes the astronomical positions and the derived astrological data (signs, aspects) needed to generate a daily reading — reproducibly, and with tests.

## Why it exists
Daily "oracle" content has to be **accurate and reproducible**: the same date must always return the same result, and the numbers have to match an authoritative source. This engine isolates that logic behind a clean API so any client — a website, or a Telegram daily-report bot — can request a day's data without embedding astronomy math of its own.

## What it does
- Computes **ephemeris-based positions** for a given date and derives **signs** and **aspects**.
- Exposes them through serverless API endpoints (`/api/calcular-dia`, `/api/health`).
- Is **deterministic and verified**: a test suite checks output for known dates against an external reference (astro.com), plus dated audit scripts.

## Architecture
```
api/        serverless endpoints (calcular-dia, health)
lib/        core logic — ephemeris.js, signos.js, aspectos.js
config/     constants (reference tables, thresholds)
tests/      known-date tests + dated audits vs. external source
```
- **Auth:** protected by an API key (no public write access).
- **Secrets:** all configuration via environment variables (`.env.example` provided); nothing sensitive committed.
- **Deploy:** serverless on **Vercel**; persistence via **Supabase**.

## Engineering decisions
- **Determinism over convenience** — the calculation is pure and reproducible, so results can be cached and audited.
- **Verified against an external source** — astronomical output is tested against astro.com for known dates. Accuracy is treated as a feature, not an afterthought.
- **Separation of concerns** — astronomy (`lib/`) is decoupled from transport (`api/`), so the engine can be reused by any client.

## Run locally
```bash
npm install
cp .env.example .env   # add your keys
npm test               # run known-date tests
```

— Built by Tomás Muñoz (JUTILABS).
