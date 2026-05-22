# Smalltouch Studio — Claude Code Instructions

## Development Rules

### 1. Vercel + Supabase Free Tier Compatibility
All code must run within the limits of the **free tiers** of Vercel and Supabase. Do not implement anything that requires a paid plan. Plans will be upgraded later when usage exceeds free tier capacity.

**Vercel Free Tier limits to stay within:**
- Serverless function execution: 10s max timeout (Hobby plan limit)
- Serverless function memory: 1024 MB
- Bandwidth: 100 GB/month
- Build minutes: 6000/month
- No background/cron jobs (not available on Hobby)
- Edge functions are fine

**Supabase Free Tier limits to stay within:**
- Database: 500 MB
- Storage: 1 GB
- Bandwidth: 5 GB/month
- Edge Functions: 500K invocations/month
- Auth: 50,000 MAU
- Realtime: 200 concurrent connections
- Row-level security must always be enabled on all tables
- No pg_cron or advanced extensions that require paid plan

If an approach would exceed these limits, flag it and propose a free-tier-compatible alternative before writing any code.

---

### 2. User Documentation Alongside Every Feature
Every feature added must be accompanied by an entry in the help/documentation section. Documentation lives in `docs/help/` and is also surfaced in-app via a Help section.

**For each feature, document:**
- What the feature does (plain language, user-facing)
- Step-by-step usage instructions
- Any token costs involved
- Expected outcomes and output formats
- Common issues or tips

Do not mark a feature as complete without its corresponding help doc.

---

### 3. API Schema Documentation Before Implementation
Every API endpoint or external API integration must have its schema documented **before** any implementation code is written.

**Schema docs live in `docs/api/`.**

Each schema doc must cover:
- Endpoint path and HTTP method
- Request headers
- Request body (with types and required/optional status)
- Response body (success and error cases)
- Token/auth requirements
- Rate limits or quotas if applicable

**If there is no existing schema documentation for an API being integrated, ask the user before writing any code.**

---

## Project Overview
See `docs/DEVPLAN.md` for the full development plan, architecture, tech stack, and phase breakdown.
