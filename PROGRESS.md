# Smalltouch Studio — Implementation Progress

> Last updated: 2026-05-22

---

## Overall Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Foundation | ✅ Complete |
| Phase 2 | Retouching Panel — One Click Enhance | ✅ Complete |
| Phase 3 | Advanced Edit with layer controls | ✅ Complete |
| Phase 4 | Batch Processing | ✅ Complete |
| Phase 5 | Background Panel | ✅ Complete |
| Phase 6 | Token System, Packages & Admin | ✅ Complete |
| Phase 7 | Polish & Launch | ❌ Not started |
| Phase 8 | Future Panels | ❌ Not started |

---

## Phase 1 — Foundation ✅

| Item | Status | Notes |
|------|--------|-------|
| React + Vite + Tailwind setup | ✅ Done | `package.json`, `vite.config.js`, `tailwind.config.js` |
| Dark design system | ✅ Done | Colors, typography, scrollbars in `src/index.css` |
| Supabase auth (email/password) | ✅ Done | `AuthProvider`, login, signup pages |
| Registry system — panels | ✅ Done | `src/registry/panels.js` |
| Registry system — actions | ✅ Done | `src/registry/actions.js` |
| Registry system — models | ✅ Done | `src/registry/models.js` |
| Registry system — presets | ✅ Done | `src/registry/presets.js` — all 9 system presets |
| Registry system — packages | ✅ Done | `src/registry/packages.js` — all 5 tiers |
| Access control library | ✅ Done | `src/lib/access.js` — `canUsePanel`, `canUseAction`, limits |
| Supabase storage helpers | ✅ Done | `src/lib/storage.js` |
| Dashboard page | ✅ Done | Panel cards, locked states, featured presets |
| Navbar with token balance | ✅ Done | Low/empty balance color states |
| Protected routes | ✅ Done | Redirects to login when unauthenticated |
| Vercel configuration | ✅ Done | `vercel.json` with 10s function timeout |
| Environment variable template | ✅ Done | `.env.local.example` |
| Supabase schema | ✅ Done | `docs/supabase-schema.sql` — tables, RLS, triggers, functions |
| Google OAuth | ❌ Pending | Supabase supports it; needs dashboard config + UI button |

---

## Phase 2 — One Click Enhance ✅

| Item | Status | Notes |
|------|--------|-------|
| Image upload with drag & drop | ✅ Done | `LibraryPanel.jsx` — multi-file, preview grid |
| Preset card grid | ✅ Done | `QuickEnhance.jsx` — all 9 system presets |
| Category filter bar | ✅ Done | All / Portrait / Beauty / Editorial / E-commerce / Color |
| Inline before/after slider on card click | ✅ Done | `BeforeAfterSlider.jsx` — drag divider |
| Vercel serverless proxy — start job | ✅ Done | `api/retouch/start.js` |
| Vercel serverless proxy — poll status | ✅ Done | `api/retouch/status.js` |
| Vercel serverless proxy — download result | ✅ Done | `api/retouch/download.js` |
| Client-side job polling (3s interval) | ✅ Done | `useRetouch.js` — `pollStatus()` |
| Results panel with progress | ✅ Done | `ResultsPanel.jsx` — progress bars, status icons |
| Before/after thumbnail in results | ✅ Done | `BeforeAfterSlider` embedded in result card |
| Single image download | ✅ Done | Signed URL from Supabase outputs bucket |
| Token deduction on confirm | ✅ Done | `deductTokens()` before API call |
| Token refund on failure | ✅ Done | Auto-refund in catch block of `runQuickEnhance` |
| Admin preset editor (`/admin/presets`) | ❌ Pending | Admin panel not yet built |

---

## Phase 3 — Advanced Edit ✅

| Item | Status | Notes |
|------|--------|-------|
| Side-by-side original + edited viewer | ✅ Done | `AdvancedEdit.jsx` — stacked CSS blend layers |
| Plugin checkbox controls | ✅ Done | 12 plugins listed, all toggleable |
| Intensity mode selector | ✅ Done | Subtle / Normal / Extreme with alpha table |
| Start Editing → layered ZIP flow | ✅ Done | `runAdvancedEdit` in `useRetouch.js` |
| JSZip extraction of layer PNGs | ✅ Done | `jszip` — extracts PNGs, reads `result.json` |
| CSS blend mode live compositing | ✅ Done | `mix-blend-mode` per layer in `AdvancedEdit.jsx` |
| Layer opacity sliders | ✅ Done | `LayerControls.jsx` — per-layer range inputs |
| Save as Preset | ✅ Done | Saves to Supabase `presets` table with `layer_opacities` |
| Sharp server-side compositing | ❌ Pending | Final download uses signed URL; Sharp compositing not wired |
| Changing intensity resets layers | ✅ Done | Handled in `AdvancedEdit.jsx` — sliders only visible after layers returned |

---

## Phase 4 — Batch Processing ✅ Complete

| Item | Status | Notes |
|------|--------|-------|
| Batch queue UI | ✅ Done | `LibraryPanel.jsx` — queue section with remove buttons |
| Multi-file upload | ✅ Done | Already supports multiple files |
| Add to batch from library | ✅ Done | Hover "+" button on each library image |
| Batch job execution | ✅ Done | `handleStartBatch` in `RetouchPage.jsx` — uses active Quick Enhance preset |
| Concurrent polling per image | ✅ Done | `Promise.allSettled` runs all items concurrently; each polls independently |
| Per-image progress tracking | ✅ Done | `batchStatuses` map passed to `LibraryPanel` — shows pending/processing/done/failed icons |
| ZIP download of all results | ✅ Done | `handleDownloadAll` uses JSZip to bundle all completed results |

---

## Phase 5 — Background Panel ✅ Complete

| Item | Status | Notes |
|------|--------|-------|
| Background removal (Replicate rembg) | ✅ Done | `api/background/remove.js` — Supabase signed URL → rembg |
| Solid/gradient background replace | ✅ Done | `CanvasPreview.jsx` renders in real time |
| AI background generation (SDXL) | ✅ Done | `api/background/generate.js` |
| Smart Expand (inpainting) | ✅ Done | `api/background/expand.js` — client builds mask, sends to inpainting model |
| Stock background library | ✅ Done | `BackgroundTools.jsx` loads from Supabase `backgrounds` bucket |
| Canvas compositing preview | ✅ Done | `CanvasPreview.jsx` — HTML Canvas, all bg types |
| Export pipeline | ✅ Done | `canvas.toBlob()` → PNG download |
| API schema docs | ✅ Done | `docs/api/replicate-api.md`, `docs/api/background-endpoints.md` |
| In-app help entries | ✅ Done | `HelpPage.jsx` — 5 bg sections added |
| Route registered | ✅ Done | `/background` route in `App.jsx` |
| Panel status active | ✅ Done | `panels.js` status changed to active |

---

## Phase 6 — Token System ✅ Complete

| Item | Status | Notes |
|------|--------|-------|
| Package registry | ✅ Done | 5 tiers in `packages.js` |
| Access control | ✅ Done | `access.js` — panel/action/batch/file-size checks |
| Voucher redemption flow | ✅ Done | `api/tokens/redeem.js` + `TokensPage.jsx` |
| Locked panel cards on dashboard | ✅ Done | Greyed out with required package badge |
| Token balance in navbar | ✅ Done | Color-coded: purple → amber (low) → red (empty) |
| Low balance warning | ✅ Done | Navbar pill turns red at 0 tokens |
| Per-operation token deduction | ✅ Done | Quick Enhance and Advanced Edit wired |
| Token refund on failure | ✅ Done | Wired in `runQuickEnhance` |
| Token voucher generation (admin) | ✅ Done | `api/tokens/generate.js` — generates up to 500 codes per batch |
| Admin dashboard `/admin` | ✅ Done | `AdminPage.jsx` — Generate / Codes / Users tabs |
| CSV export of codes | ✅ Done | Client-side CSV download in Generate and Codes tabs |
| Manual package assignment (admin) | ✅ Done | Users tab — inline package dropdown per user |
| Locked action button states | ✅ Done | Advanced Edit shows lock card; AI Generate and Expand show lock icons in BackgroundTools |
| Admin route protection | ✅ Done | `AdminRoute.jsx` — redirects non-admins; VITE_ADMIN_EMAIL env var |
| Codes list (admin) | ✅ Done | `api/admin/codes.js` + Codes tab with filter and CSV export |
| Admin help entry | ✅ Done | `HelpPage.jsx` — Admin Dashboard section added |
| API schema docs | ✅ Done | `docs/api/admin-endpoints.md` |

---

## Phase 7 — Polish & Launch ❌ Not Started

| Item | Status | Notes |
|------|--------|-------|
| Mobile responsive (tab layout) | ❌ Pending | Currently desktop-only |
| Error handling refinement | 🔶 Partial | Basic error states exist |
| Loading states and animations | 🔶 Partial | Spinners exist; no skeleton loaders |
| Onboarding flow | ❌ Pending | |
| Google OAuth login | ❌ Pending | |
| History page | ✅ Done | `HistoryPage.jsx` — jobs list with download |
| Help page (in-app) | ✅ Done | `HelpPage.jsx` — full accordion covering all features |

---

## In-App Help Coverage ✅

Per CLAUDE.md rules, every implemented feature must have a help entry. All implemented features are covered:

| Feature | Help Entry | Location |
|---------|-----------|----------|
| Retouch Studio overview | ✅ | "Retouch Studio — Overview" |
| One Click Enhance | ✅ | "One Click Enhance" |
| Advanced Edit | ✅ | "Advanced Edit" |
| Batch Processing | ✅ | "Batch Processing" |
| Plugin reference | ✅ | "Plugin Reference" |
| Tokens and Packages | ✅ | "Tokens and Packages" |
| File requirements | ✅ | "File Requirements" |
| Background Studio overview | ✅ | "Background Studio — Overview" |
| Background Removal | ✅ | "Remove Background" |
| Background Replace | ✅ | "Replace Background" |
| Background Blur | ✅ | "Blur Background" |
| Smart Expand | ✅ | "Smart Expand" |

---

## Setup Requirements

Before the app can run, the following must be configured:

### Supabase
1. Create a Supabase project
2. Run `docs/supabase-schema.sql` in the SQL editor
3. Create storage buckets: `inputs` (private), `outputs` (private), `backgrounds` (public), `thumbnails` (private)
4. Add RLS policies on storage buckets (user-scoped folder access)

### Environment Variables
Copy `.env.local.example` to `.env.local` and fill in:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RETOUCH4ME_TOKEN` (from retouch4.me/token_page)

### Vercel
Deploy with `vercel deploy`. All serverless functions in `/api/` deploy automatically.

---

## Next Tasks (Priority Order)

1. **Mobile layout** — tab-based view for library / tools / results on < 768px (Phase 7)
2. **Google OAuth** — add button to login/signup pages, configure in Supabase (Phase 7)
3. **Sharp compositing** — server-side flat JPEG download for Advanced Edit results (Phase 3 pending item)
4. **Onboarding flow** — welcome screen / guide for new users (Phase 7)
5. **Admin preset editor** — `/admin/presets` for uploading before/after images and plugin configs (Phase 2 pending)
6. **Error handling** — toast notifications, retry logic (Phase 7)
