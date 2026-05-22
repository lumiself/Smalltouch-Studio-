# Smalltouch Studio — Development Rules

## Rule 1: Vercel + Supabase Free Tier Compatibility

All code must run within the **free tiers** of Vercel and Supabase. Plans will be upgraded when user volume exceeds free tier capacity — until then, every implementation decision must stay within these constraints.

### Vercel Hobby (Free) Limits

| Resource | Limit |
|---|---|
| Serverless function timeout | 10 seconds |
| Serverless function memory | 1024 MB |
| Bandwidth | 100 GB/month |
| Build minutes | 6,000/month |
| Cron / background jobs | Not available |

### Supabase Free Tier Limits

| Resource | Limit |
|---|---|
| Database size | 500 MB |
| Storage | 1 GB |
| Bandwidth | 5 GB/month |
| Edge Function invocations | 500,000/month |
| Auth monthly active users | 50,000 |
| Realtime concurrent connections | 200 |

**Rules:**
- Row-level security (RLS) must be enabled on all Supabase tables
- If an approach requires exceeding these limits, flag it and propose a free-tier-compatible alternative before writing code
- No pg_cron, background workers, or extensions unavailable on the free plan

---

## Rule 2: Help Documentation Alongside Every Feature

Every feature must ship with user-facing documentation. Help docs live in `docs/help/` and are surfaced in-app.

**Each help doc must include:**
- Plain-language description of the feature
- Step-by-step usage instructions
- Token costs involved
- Expected output / what the user receives
- Tips and common issues

A feature is not complete without its help doc.

**Help docs folder:** `docs/help/`

---

## Rule 3: API Schema Documentation Before Implementation

Every API endpoint (internal Vercel functions) and external API integration (Retouch4me, Replicate, Supabase) must have a schema document **written and reviewed before implementation begins**.

**Schema docs folder:** `docs/api/`

**Each schema doc must cover:**
- Endpoint path and HTTP method
- Request headers (auth, content type)
- Request body with field names, types, and required/optional status
- Response body for success and all error cases
- Token/auth requirements
- Rate limits or quotas

**If no schema documentation exists for an API being integrated — ask the user before writing any code.**
