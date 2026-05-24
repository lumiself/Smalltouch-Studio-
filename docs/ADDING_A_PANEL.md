# Adding a New Panel

This guide covers every step required to wire a new panel into the modular structure — from registry entries through to admin presets, token plans, and in-app help.

Follow the steps in order. Each step depends on the previous one.

---

## Quick Reference

| Step | File(s) | Notes |
|------|---------|-------|
| 1. Register the panel | `src/registry/panels.js` | Start with `status: "coming_soon"` |
| 2. Define actions | `src/registry/actions.js` | One entry per action with token cost |
| 3. Assign to packages | `src/registry/packages.js` | Decides which tiers unlock the panel |
| 4. Add the route | `src/App.jsx` | Lazy-import the page component |
| 5. Add nav links | `src/components/layout/Navbar.jsx`, `BottomNav.jsx` | Desktop + mobile nav |
| 6. Create the page | `src/pages/{Panel}Page.jsx` | Wrap in `<PanelShell>` |
| 7. Create components | `src/components/{panel}/` | Tool-specific UI |
| 8. Create the hook | `src/hooks/use{Panel}.js` | API call logic |
| 9. Create the API route | `api/{panel}/[...path].js` | Serverless handler |
| 10. Admin presets | `/admin/presets` UI | No code — data only |
| 11. In-app help | `src/pages/HelpPage.jsx` | Required per project rules |
| 12. API schema doc | `docs/api/{panel}-endpoints.md` | Required before shipping |

---

## Step 1 — Register the Panel

**File:** `src/registry/panels.js`

Add a new entry to the `panels` array. Use `status: "coming_soon"` while building so the panel appears on the dashboard but the route is not yet linked.

```js
{
  id: "headshot",           // kebab-case, used everywhere as the panel key
  name: "Headshot Generator",
  icon: "📸",               // emoji shown on dashboard cards
  status: "coming_soon",    // switch to "active" when ready to ship
  route: null,              // set to "/headshot" when the page is ready
  description: "Turn casual photos into professional headshots",
}
```

When the panel is ready to ship, update `status` to `"active"` and `route` to the path.

---

## Step 2 — Define Actions

**File:** `src/registry/actions.js`

Add one entry per action the panel exposes. The `id` is the canonical key used in token deduction calls and access checks.

```js
{
  id: "headshot_generate",      // unique across all panels
  panel: "headshot",            // must match the panel id from Step 1
  name: "Generate Headshot",
  tokenCost: 2,                 // tokens deducted per run
  outputType: "flat",           // "flat" | "layered" | "png"
},
{
  id: "headshot_batch",
  panel: "headshot",
  name: "Batch Headshots",
  tokenCost: 1,
  outputType: "flat",
},
```

**Choosing `tokenCost`:**
- `1` — fast, single-pass operations (removal, simple transform)
- `2` — generative or multi-step operations (AI generate, layered output)
- `3+` — reserved for heavy batch or high-compute actions

---

## Step 3 — Assign to Packages

**File:** `src/registry/packages.js`

Decide which pricing tiers unlock this panel and its actions, then add them to the relevant package entries.

```js
// Example: headshot only available on pro and studio
{
  id: "pro",
  panels: ["retouch", "background", "headshot"],   // add panel id
  actions: "all",
  ...
},
{
  id: "studio",
  panels: "all",   // already covered — no change needed
  actions: "all",
  ...
},
```

Rules:
- Packages with `panels: "all"` or `actions: "all"` automatically include new panels/actions — no change needed.
- Lower tiers (starter, basic, standard) need explicit additions if you want them to have access.
- Always add the panel before the actions — `canUsePanel` is checked first.

---

## Step 4 — Add the Route

**File:** `src/App.jsx`

Add a lazy import and a `<Route>` inside the authenticated route block.

```jsx
// 1. Add the lazy import near the top with the others
const HeadshotPage = lazy(() => import('./pages/HeadshotPage'))

// 2. Add the route inside the <Routes> block
<Route path="/headshot" element={
  <ProtectedRoute>
    <AppLayout><HeadshotPage /></AppLayout>
  </ProtectedRoute>
} />
```

---

## Step 5 — Add Nav Links

Two files need updating — desktop navbar and mobile bottom nav.

**`src/components/layout/Navbar.jsx`** — `PANEL_LINKS` array at the top:

```jsx
import { Camera } from 'lucide-react'   // pick the right lucide icon

const PANEL_LINKS = [
  { path: '/dashboard',  label: 'Home',      icon: Home     },
  { path: '/retouch',    label: 'Retouch',   icon: Sparkles },
  { path: '/background', label: 'Background', icon: Image   },
  { path: '/headshot',   label: 'Headshot',  icon: Camera   }, // add here
  { path: '/history',    label: 'History',   icon: History  },
]
```

**`src/components/layout/BottomNav.jsx`** — `NAV_ITEMS` array:

```jsx
const NAV_ITEMS = [
  { path: '/dashboard', icon: Home,     label: 'Home'     },
  { path: '/retouch',   icon: Sparkles, label: 'Retouch'  },
  { path: '/headshot',  icon: Camera,   label: 'Headshot' }, // add here
  { path: '/history',   icon: History,  label: 'History'  },
  { path: '/tokens',    icon: Coins,    label: 'Tokens'   },
]
```

> The bottom nav has limited space on mobile. If there are more than 4–5 panels, consider consolidating or using a drawer.

---

## Step 6 — Create the Page Component

**File:** `src/pages/HeadshotPage.jsx`

Use `RetouchPage.jsx` as the reference. Every panel page follows the same shape:

```jsx
import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTokens } from '../hooks/useTokens'
import { useToast } from '../contexts/ToastContext'
import { useLibrary } from '../contexts/LibraryContext'
import { canUseAction } from '../lib/access'
import PanelShell from '../components/shared/PanelShell'
import HeadshotTool from '../components/headshot/HeadshotTool'

const TOOL_NAV = [
  { id: 'generate', label: 'Generate', Icon: Camera },
  { id: 'batch',    label: 'Batch',    Icon: Layers },
]

export default function HeadshotPage() {
  const { user, profile } = useAuth()
  const { balance, deductTokens, refundTokens } = useTokens()
  const { selectedImage, addJob, updateJob } = useLibrary()
  const { runGenerate } = useHeadshot({ addJob, updateJob })
  const toast = useToast()
  const navigate = useNavigate()

  const [activeTool, setActiveTool] = useState('generate')
  const [mobileTab, setMobileTab] = useState('tools')

  const handleGenerate = useCallback(async (options) => {
    if (!user || !selectedImage) return
    if (!canUseAction(profile, 'headshot_generate')) { navigate('/tokens'); return }
    try {
      await deductTokens(user.id, 2, crypto.randomUUID(), 'headshot_generate')
      await runGenerate({ userId: user.id, file: selectedImage.file, options })
      setMobileTab('results')
    } catch (err) {
      toast.error(err.message || 'Generation failed')
    }
  }, [user, selectedImage, profile, deductTokens, runGenerate, navigate, toast])

  return (
    <PanelShell mobileTab={mobileTab} onMobileTabChange={setMobileTab}>
      {/* tool nav + tool content go here — mirror RetouchPage structure */}
    </PanelShell>
  )
}
```

Key rules for the page:
- Always wrap in `<PanelShell>` — it provides the Library / Tools / Results three-column layout.
- Check `canUseAction(profile, actionId)` before every action, redirect to `/tokens` on fail.
- Always call `deductTokens` before the API call. Catch errors and `refundTokens` if the API fails.
- Use `crypto.randomUUID()` for the idempotency key passed to `deductTokens`.

---

## Step 7 — Create the Components Directory

**Directory:** `src/components/{panel}/`

Create one file per tool (matching the `TOOL_NAV` entries in the page):

```
src/components/headshot/
  HeadshotTool.jsx     ← main tool UI
  BatchHeadshot.jsx    ← batch variant if needed
```

Each component receives its data via props from the page. It does not call APIs directly — it calls handler callbacks passed from the page.

---

## Step 8 — Create the Panel Hook

**File:** `src/hooks/use{Panel}.js`

Isolate all API call logic in a hook. The page passes `addJob` / `updateJob` from `useLibrary` so the hook can post job progress.

```js
import { useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useHeadshot({ addJob, updateJob }) {
  const abortRef = useRef(null)

  async function runGenerate({ userId, file, options }) {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('options', JSON.stringify(options))
    formData.append('userId', userId)

    const jobId = crypto.randomUUID()
    addJob({ id: jobId, type: 'headshot_generate', status: 'processing', inputName: file.name })

    try {
      const res = await fetch('/api/headshot/generate', { method: 'POST', body: formData })
      if (!res.ok) throw new Error((await res.json()).error || 'API error')
      const data = await res.json()
      updateJob(jobId, { status: 'completed', outputPath: data.outputPath })
      return { jobId }
    } catch (err) {
      updateJob(jobId, { status: 'failed' })
      throw err
    }
  }

  return { runGenerate }
}
```

---

## Step 9 — Create the API Route

**File:** `api/{panel}/[...path].js`

All panel API routes live under `api/{panel}/`. Use the catch-all pattern to handle multiple sub-routes from one file.

```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const [action] = req.query.path ?? []

  if (req.method === 'POST' && action === 'generate') {
    return handleGenerate(req, res)
  }

  return res.status(404).json({ error: 'Not found' })
}

async function handleGenerate(req, res) {
  // parse formData, call external AI API, store result in Supabase storage
  // keep total execution under 10s (Vercel Hobby limit)
}
```

Vercel free tier constraint: **10-second max execution**. For long-running AI calls, kick off an async job and poll — do not await the full result in the serverless function.

Document this endpoint in `docs/api/{panel}-endpoints.md` before shipping (see Step 12).

---

## Step 10 — Admin Presets (No Code Required)

Once the panel is registered, admins can create presets for it through the UI at `/admin/presets`.

The `system_presets` table has a `panel` field that scopes each preset. No code changes are needed — the preset editor already lists all registered panels.

For each preset, the admin sets:
- `panel` — which panel this preset belongs to
- `name` / `icon` / `description` — displayed in the tool UI
- `token_cost` — overrides the base action cost if set
- `categories` — used to filter presets in the tool
- `before_image_url` / `after_image_url` — demo images shown in the preset picker
- `sort_order` — display order within a category
- `status` — `active` (shown to users) or `hidden` (draft)

To load presets in your tool component, query Supabase filtered by panel:

```js
const { data } = await supabase
  .from('system_presets')
  .select('*')
  .eq('panel', 'headshot')
  .eq('status', 'active')
  .order('sort_order')
```

See `src/components/retouch/QuickEnhance.jsx` for the full preset loading and selection pattern.

---

## Step 11 — In-App Help Entry (Required)

**File:** `src/pages/HelpPage.jsx`

Every panel needs a help entry before it ships. Add a section covering:

- What the panel does (plain language)
- Step-by-step usage instructions
- Token costs per action
- Expected output format
- Common issues or tips

This is a hard project requirement — do not mark the panel as complete without it.

---

## Step 12 — API Schema Doc (Required)

**File:** `docs/api/{panel}-endpoints.md`

Document every API endpoint before writing the implementation. Required fields:

- Endpoint path and HTTP method
- Request headers
- Request body (fields, types, required/optional)
- Response body (success and error shapes)
- Token/auth requirements
- Rate limits or Vercel timeout considerations

See `docs/api/retouch4me-cloud-api.md` or `docs/api/background-endpoints.md` as examples.

---

## Activating the Panel

When the panel is ready to ship:

1. Update `src/registry/panels.js` — set `status: "active"` and `route: "/{panel}"`
2. Verify the route in `App.jsx` is in place
3. Verify nav links in `Navbar.jsx` and `BottomNav.jsx` are in place
4. Check the help entry exists in `HelpPage.jsx`
5. Confirm at least one active preset exists in the database for the panel

The dashboard panel card will automatically link to the route once `status` is `"active"`.

---

## Access Control Reference

`src/lib/access.js` exports the guards used throughout the app:

| Function | Usage |
|----------|-------|
| `canUsePanel(profile, panelId)` | Check before showing the panel UI |
| `canUseAction(profile, actionId)` | Check before running any action |
| `getRequiredPackage(panelId)` | Find the minimum package for upsell prompts |
| `getRequiredPackageForAction(actionId)` | Find minimum package for an action |

Always check `canUseAction` in the page handler before calling `deductTokens`. The dashboard and routing handle `canUsePanel` automatically via the package config.
