# Smalltouch Studio — Development Plan

> *An AI-powered photo retouching SaaS built with React, Vercel, and Supabase. Features one-click enhancement modes, a layered preset builder, and batch processing powered by the Retouch4me Cloud API.*

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Platform Panels](#platform-panels)
4. [Panel 1 — Retouching Studio](#panel-1--retouching-studio)
5. [Panel 2 — Background Studio](#panel-2--background-studio)
6. [Panel 3 — Future Panels](#panel-3--future-panels)
7. [Architecture](#architecture)
8. [Modular Registry System](#modular-registry-system)
9. [Shared Storage](#shared-storage)
10. [Database Schema](#database-schema)
11. [Token System](#token-system)
12. [API Integrations](#api-integrations)
13. [Development Phases](#development-phases)
14. [Token Packages](#token-packages)
15. [UI Design System](#ui-design-system)
16. [Folder Structure](#folder-structure)

---

## Project Overview

**Smalltouch Studio** is a multi-panel AI-powered image editing platform targeting photographers, e-commerce sellers, and creative professionals. The platform is built around the philosophy of *subtle, natural-looking AI enhancements* rather than heavy-handed filters.

The platform is modular — each panel is a self-contained editing tool that shares the same authentication, token system, and Supabase input/output storage pipeline. There are no online payment systems — users purchase physical token vouchers with cash and redeem them in the app.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + Vite | UI framework |
| Styling | Tailwind CSS | Component styling |
| Hosting | Vercel | Frontend + serverless functions |
| Auth & DB | Supabase | Authentication, user data, presets |
| Storage | Supabase Storage | Shared input/output for all panels |
| Retouching API | Retouch4me Cloud API | Portrait retouching |
| Background AI | Replicate API | Background manipulation models |
| Compositing | Sharp (Node.js) | Server-side layer compositing |
| ZIP handling | JSZip | Client-side ZIP extraction |
| Payments | Cash voucher system | Token redemption, no online payments |

---

## Platform Panels

Smalltouch Studio is organized into independent panels accessible from the main dashboard:

```
┌─────────────────────────────────────────────────────┐
│  Smalltouch Studio                              👤   │
├─────────────────────────────────────────────────────┤
│                                                     │
│   [🎨 Retouch]  [🖼 Background]  [🔮 Coming Soon]   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Panel 1 — Retouching Studio

Powered by the **Retouch4me Cloud API**.

The panel is split into two sections stacked vertically in the center column:
1. **One Click Enhance** — preset cards at the top
2. **Advanced Edit** — layer-based editor below

---

### Section 1 — One Click Enhance

Preset cards for users who want fast results. Each preset has a name, category, token cost, and admin-uploaded before/after images.

#### Preset Categories

Presets are tagged with one or more categories. A filter bar above the cards lets users narrow the grid.

| Category | Presets |
|---|---|
| Portrait | Natural, Glam, Fresh, Matte, Sharp |
| Beauty | Glam, Fresh |
| Editorial | Matte, Sharp |
| E-commerce | E-commerce |
| Product | E-commerce |
| Color | Color — Exposure, Color — Exposure + WB, Color — Full |

Default system presets:

| Preset | Category | Plugins Used | Best For |
|---|---|---|---|
| Natural | Portrait | Heal + Skin Tone + Eye Vessels | Everyday portraits |
| Glam | Portrait, Beauty | Heal + Dodge Burn + White Teeth + Eye Brilliance | Beauty & fashion |
| Fresh | Portrait, Beauty | Heal + Mattifier + Skin Tone + Eye Brilliance | Lifestyle photography |
| Matte | Portrait, Editorial | Heal + Mattifier + Portrait Volumes + Skin Tone | Editorial |
| Sharp | Portrait, Editorial | Heal + Dodge Burn + Portrait Volumes + Eye Brilliance | Commercial headshots |
| E-commerce | E-commerce, Product | Dust + Clean Backdrop + Fabric | Product photography |
| Color — Exposure | Color | Color Correction (Exposure only) | Exposure-only fix |
| Color — Exposure + WB | Color | Color Correction (Exposure & WB) | Exposure + white balance |
| Color — Full | Color | Color Correction (Full) | Complete AI color grade |

#### Preset Card Interaction

- Cards display: thumbnail (before image), preset name, category tags, token cost badge
- **Clicking a card** opens an inline before/after slider preview — no navigation, no modal — so the user can judge the look before committing
- Selecting a card (second click / dedicated select button) marks it as active
- Active card shows a highlighted border; "Enhance Now" button becomes available
- If no image is loaded in the library, the Enhance Now button prompts the user to upload first

#### Token Billing

- **Token is deducted immediately** when the user confirms an action (Enhance Now / Start Editing)
- **Token is refunded automatically** if the Retouch4me job fails (API error, timeout, or `state: "failed"` response)
- Refund is applied before the error message is shown — the user never loses a token on a failed job

#### Admin Preset Editor

Admins manage presets from `/admin/presets`. Each preset entry has:

| Field | Type | Description |
|---|---|---|
| Name | text | Display name shown on the card |
| Categories | multi-select | Tags used by the filter bar |
| Before image | image upload | Representative source photo shown on the card |
| After image | image upload | Retouched result shown in the before/after slider |
| Plugin config | JSON / slider UI | Full Retouch4me payload — plugin list, Alpha1, Alpha2, Scale per plugin |
| Token cost | number | Tokens deducted when this preset is applied |
| Status | active / hidden | Hidden presets do not appear in the panel |

The before/after images are stored in the `backgrounds` Supabase bucket (public). The plugin config is stored in the `presets` table.

---

### Section 2 — Advanced Edit

For photographers who need full control. Lives below the One Click Enhance section in the same center column.

#### Workflow

```
User selects image from library
    → Image loads in "Original" panel
        → User enables plugins via checkboxes
        → User picks intensity mode: Subtle / Normal / Extreme
        → User clicks [Start Editing]
            → App sends image + intensity-mode Alpha values to Retouch4me
            → Retouch4me returns layered ZIP (one PNG per plugin)
                → Layers stacked via CSS blend modes at 100% opacity
                    → User moves opacity sliders per layer (range: 0 → 100% of that layer)
                    → Edited image updates in real-time (no re-fetch)
                        → User clicks [Save as Preset]
                            → Preset stores final Alpha per plugin:
                              final_alpha = slider_fraction × mode_alpha
                                → User can apply that preset to bulk edit remaining images
```

#### Intensity Mode

Before hitting Start Editing, the user picks one of three intensity levels. This sets the Alpha values that are sent to the API. The layers come back rendered at those values — they are the ceiling for the opacity sliders.

| Mode | Description | Alpha range used |
|---|---|---|
| Subtle | Light touch, preserves natural texture | ~0.2 of the plugin's max |
| Normal | Balanced commercial result | ~0.5–0.6 of the plugin's max |
| Extreme | Strong, polished look | ~0.9–1.0 of the plugin's max |

**Changing mode after layers are returned requires a new Start Editing call.**
If the user selects a different intensity mode after layers have already been fetched, the current layers and opacity state are discarded and the [Start Editing] button reactivates. This is intentional — it ensures that the saved preset and any subsequent batch jobs always match the previewed result exactly. There is no way to upgrade or downgrade the intensity of existing layers without re-processing.

**Alpha values per plugin per mode:**

| Plugin | Subtle α1 | Normal α1 | Extreme α1 | α2 (Subtle/Normal/Extreme) | Scale |
|---|---|---|---|---|---|
| Heal | 0.2 | 0.6 | 1.0 | — | 0 |
| Dodge Burn | 0.2 | 0.6 | 1.0 | 0.05 / 0.15 / 0.35 | 2 |
| Portrait Volumes | 0.1 | 0.3 | 0.9 | — | 0 |
| Eye Vessels | 0.2 | 0.5 | 1.0 | — | 0 |
| Eye Brilliance | 0.2 | 0.5 | 0.85 | — | 0 |
| White Teeth | 0.1 | 0.25 | 0.65 | 0.08 / 0.25 / 0.55 | 0 |
| Mattifier | 0.2 | 0.5 | 0.9 | — | 0 |
| Skin Tone | 0.2 | 0.5 | 1.0 | 0.2 / 0.5 / 1.0 | 0 |
| Fabric | 0.1 | 0.39 | 0.75 | — | 0 |
| Dust | 0.2 | 0.5 | 1.0 | — | 3 |
| Clean Backdrop | 0.2 | 0.5 | 1.0 | — | 0 |
| Glasses Anti Glare | 0.2 | 0.5 | 1.0 | — | — |

> Face Detection has no Alpha — it is always included automatically when Glasses Anti Glare is enabled.
> Skin Mask and Face Lifting are not available in Advanced Edit (see decisions log below).

#### How the Slider Maps to the Final Preset Value

The opacity slider for each layer goes from **0% to 100%**. 100% means the layer is shown at the full strength it was rendered at (the mode value). The final Alpha stored in the preset is:

```
final_alpha = slider_fraction × mode_alpha_value

Examples (Heal, Normal mode, mode_alpha = 0.6):
  Slider at 100%  →  final_alpha = 1.0 × 0.6 = 0.6
  Slider at 50%   →  final_alpha = 0.5 × 0.6 = 0.3
  Slider at 0%    →  final_alpha = 0            (layer hidden)
```

This means the user can never accidentally exceed the ceiling of their chosen intensity mode.

#### Plugin Controls

Each available plugin has a row with:
- **Checkbox** — enables/disables the plugin (checked plugins are included in the API call)
- No manual Alpha input at this stage — the intensity mode handles values before the API call

After layers are returned, the opacity sliders replace the plugin controls as the main adjustment tool.

**Supported Plugins in Advanced Edit:**
- Heal, Dodge Burn, Portrait Volumes, Skin Tone
- Eye Vessels, Eye Brilliance, White Teeth, Mattifier
- Glasses Anti Glare
- Clean Backdrop, Dust, Fabric

> **Not in Advanced Edit:** Skin Mask (AI mask, not a visual layer — removed, see decisions log), Face Lifting (removed, see decisions log), Face Detection (auto-included when Glasses Anti Glare is enabled), Color Correction (available as One Click Enhance preset cards instead).

#### Layer Opacity Sliders

After [Start Editing] completes and the layers are returned:
- Each enabled plugin gets an **opacity slider** in a "Layers" section below the plugin list
- Moving a slider changes the CSS `opacity` of that layer's PNG in real time — no API call
- Blend modes are applied automatically per layer (Normal / Soft Light / Linear Light)
- The edited result updates immediately as sliders move

**Layer Blend Modes:**

| Layer | Blend Mode |
|---|---|
| Heal, Fabric, Eye Vessels, Eye Brilliance, White Teeth | Normal |
| Dodge Burn, Skin Tone, Portrait Volumes | Soft Light |
| Glasses Anti Glare (full layout) | Linear Light |

#### Compositing Strategy

- **Live preview** → CSS `mix-blend-mode` on stacked PNGs (browser-native, instant)
- **Final download** → Sharp server-side compositing (pixel-perfect flat JPEG)

#### Save as Preset / Bulk Edit

When the user is happy with the look:
1. Click **[Save as Preset]** — a name field appears
2. App captures the current opacity per layer and the plugin config (Alpha values, Scale)
3. Preset is saved to Supabase `presets` table with `layer_opacities` JSON
4. Preset immediately appears in the left column batch queue as the active preset
5. User can drag additional images into the batch queue and run bulk processing

Bulk processing uses flat output (no layers) so it is faster and costs 1 token per image.

---

### Decisions Log

| Decision | Choice | Reason |
|---|---|---|
| Token deduction timing | Deducted upfront, refunded on failure | Prevents abuse while protecting users from losing tokens on API errors |
| Image library persistence | Session-only | Keeps Supabase `inputs` bucket lean; users re-upload each session |
| Advanced Edit token cost | 2 tokens | Layers are a tool for the editing session, not a deliverable — flat cost applies |
| Color Correction placement | One Click Enhance preset cards (Exposure / Exposure+WB / Full) | Doesn't fit the checkbox+intensity model; cleaner as three ready-made presets |
| Face Lifting | Removed from Advanced Edit | Complex sub-parameters don't map cleanly to the intensity model |
| Skin Mask | Removed entirely | AI-generated mask; CSS blend mode compositing cannot use it as a clip mask in the live preview; Retouch4me plugins already apply skin-targeting internally |

---

### Batch Processing

- User has a saved or temporary preset from Advanced Edit (or selects a One Click Enhance preset)
- Drags additional images into the batch queue in the left Library column
- App queues each image independently to Retouch4me with flat output
- Polls each job status concurrently
- Collects results and packages them as a downloadable ZIP
- Progress shown per image in the batch queue and the right Results panel

---

### UI Layout

```
┌──────────────┬──────────────────────────────────┬──────────────┐
│   LIBRARY    │         CENTER PANEL             │   RESULTS    │
│              │                                  │              │
│ [+ Upload]   │ ── One Click Enhance ──           │  Completed   │
│              │                                  │              │
│ [thumb]      │ Filters: [All][Portrait][Beauty] │ ✅ [thumb]   │
│ [thumb]      │          [Editorial][E-commerce] │ ✅ [thumb]   │
│ [thumb]      │                                  │ ⏳ [thumb]   │
│ [thumb]      │ ┌──────┐ ┌──────┐ ┌──────┐       │              │
│              │ │before│ │before│ │before│       │ ────────     │
│ ── Batch ──  │ │/after│ │/after│ │/after│       │              │
│              │ │Nature│ │Glam  │ │Fresh │       │ [↓ Download  │
│ ⏳ img3      │ │1 tok │ │1 tok │ │1 tok │       │    All]      │
│ ⏸ img4      │ └──────┘ └──────┘ └──────┘       │              │
│ ⏸ img5      │                                  │              │
│              │ ── Advanced Edit ──               │              │
│ [▶ Batch]    │                                  │              │
│              │ ┌──────────┬──────────┐          │              │
│              │ │ Original │  Edited  │          │              │
│              │ │  image   │  image   │          │              │
│              │ └──────────┴──────────┘          │              │
│              │                                  │              │
│              │ ✅ Heal      α1[━━●──] α2 —      │              │
│              │ ✅ Dodge Burn α1[━━━●] α2[━●───] │              │
│              │ ☐  Skin Tone                     │              │
│              │ ☐  Eye Vessels                   │              │
│              │                                  │              │
│              │ [▶ Start Editing]  Cost: 2 tok   │              │
│              │                                  │              │
│              │ ── Layers ──                     │              │
│              │ Heal        [━━━━●──────] 65%    │              │
│              │ Dodge Burn  [━━━━━━●────] 80%    │              │
│              │                                  │              │
│              │ [Save as Preset] [↓ Download]    │              │
└──────────────┴──────────────────────────────────┴──────────────┘
```

**Panel States:**

| Scenario | Library | One Click Enhance | Advanced Edit | Results |
|---|---|---|---|---|
| No image loaded | Upload prompt | Cards visible, Enhance disabled | Greyed out | Empty |
| Image selected | Highlighted | Enhance Now enabled | Original loaded | Empty |
| Processing (enhance) | Normal | Progress shown | — | Pending item |
| Layers returned | Normal | — | Layer sliders active | — |
| Preset saved | Batch queue ready | — | Save confirmed | — |
| Batch running | Queue with progress | — | — | Live progress |
| Batch complete | Reset ready | — | — | Download ready |

---

## Panel 2 — Background Studio

Powered by **Replicate API** using open source AI models.

### Features

#### Background Removal
- Clean subject extraction from any photo
- Model: `lucataco/remove-bg` or `cjwbw/rembg` on Replicate
- Output: PNG with transparent background

#### Background Replacement
- Replace removed background with:
  - Solid color picker
  - Gradient builder
  - AI-generated background (text prompt)
  - Stock background from built-in library
- AI background model: `stability-ai/stable-diffusion` on Replicate

#### Background Blur
- Bokeh/depth-of-field effect on existing background
- Adjustable blur intensity slider
- Model: custom depth estimation + blur pipeline on Replicate

#### Smart Background Expand
- Expand image canvas with AI-generated fill
- Useful for adding space around subject for text/branding
- Model: `stability-ai/stable-diffusion-inpainting` on Replicate

### Workflow

```
Upload Image
    → Remove Background (Replicate)
        → Choose replacement:
            ├── Solid/Gradient → apply client-side (Canvas)
            ├── AI Generated → send prompt to Replicate
            └── Stock → overlay from library
                → Composite subject over new background
                    → Preview → Download
```

### UI Layout

Follows the shared 3-column `PanelShell` layout. The canvas preview occupies the right column instead of a job list.

```
┌────────────┬──────────────────────┬──────────────────────────┐
│  LIBRARY   │   BACKGROUND TOOLS   │    CANVAS PREVIEW        │
│  ────────  │  ──────────────────  │  ──────────────────────  │
│            │                      │                          │
│ [Upload]   │  Background Removal  │  [Subject on Background] │
│            │  [Remove BG · 1 tok] │                          │
│  [thumb]   │                      │  (live composite —       │
│            │  Tool: [Replace]     │   updates in real-time)  │
│            │        [Blur  ]      │                          │
│            │        [Expand]      │                          │
│            │                      │  [↓ Download PNG]        │
│            │  ── Replace ──       │                          │
│            │  ○ Transparent       │                          │
│            │  ○ Solid Color       │                          │
│            │  ○ Gradient          │                          │
│            │  ○ AI Generate 🔒    │                          │
│            │  ○ Stock Library     │                          │
│            │                      │                          │
│            │  [Apply · 1 token]   │                          │
└────────────┴──────────────────────┴──────────────────────────┘
```

Mobile tabs: **Library** | **Tools** | **Canvas**

---

## Panel 3 — Future Panels

The platform is designed to be modular. Each future panel slots into the same dashboard without affecting existing panels.

### 🔮 Pose Generator *(Planned)*
- Upload one reference photo of a person
- AI generates the same person in multiple poses
- Use cases: fashion lookbooks, e-commerce model shots, social content
- Potential model: `fofr/pose-image-to-image` or custom LoRA on Replicate
- Output: selectable gallery of generated pose variants

### 🔮 Outfit Changer *(Planned)*
- Swap clothing on a model photo using AI
- Upload garment image + model photo
- AI composites garment onto model realistically
- Use case: e-commerce virtual try-on

### 🔮 Color Grading Studio *(Planned)*
- LUT-based color grading
- AI mood matching (match the color grade of a reference photo)
- Film emulation presets

### 🔮 Headshot Generator *(Planned)*
- Upload casual photos → AI generates professional headshots
- Multiple background and style options
- Use case: LinkedIn, corporate directories

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Vercel                         │
│                                                 │
│  ┌──────────────┐    ┌────────────────────────┐ │
│  │  React App   │    │  Serverless Functions  │ │
│  │  (Frontend)  │───▶│                        │ │
│  └──────────────┘    │  /api/retouch/start    │ │
│                      │  /api/retouch/status   │ │
│                      │  /api/retouch/download │ │
│                      │  /api/background/remove│ │
│                      │  /api/background/replace│ │
│                      │  /api/composite        │ │
│                      └────────────┬───────────┘ │
└───────────────────────────────────┼─────────────┘
                                    │
              ┌─────────────────────┼──────────────┐
              │                     │              │
              ▼                     ▼              ▼
     ┌────────────────┐  ┌──────────────────┐  ┌──────────┐
     │  Retouch4me    │  │   Replicate API  │  │ Supabase │
     │  Cloud API     │  │  (Background AI) │  │          │
     │                │  │                  │  │  Auth    │
     │  /start        │  │  remove-bg       │  │  DB      │
     │  /status/{id}  │  │  stable-diff     │  │  Storage │
     │  /getFile/{id} │  │  inpainting      │  │          │
     └────────────────┘  └──────────────────┘  └──────────┘
```

**Key Security Rule:** Retouch4me token and Replicate API key are **never exposed to the frontend**. All API calls are proxied through Vercel serverless functions.

---

## Modular Registry System

The entire platform is driven by a central registry. Adding a new panel, preset, action, or AI model requires only adding one entry to the relevant registry file — no changes to UI components, routing, or logic needed.

```
src/registry/
├── panels.js      → Dashboard renders panel cards automatically
├── actions.js     → Token costs + handlers auto-wired per panel
├── models.js      → API calls routed to correct provider
└── presets.js     → Quick Enhance cards auto-generated
```

---

### Panel Registry
`src/registry/panels.js`

Controls which panels appear in the dashboard. Setting `status: "coming_soon"` automatically renders a locked card with no extra code.

```js
export const panels = [
  {
    id: "retouch",
    name: "Retouch Studio",
    icon: "✨",
    status: "active",        // active | coming_soon | beta
    component: RetouchPanel,
    description: "AI portrait retouching",
  },
  {
    id: "background",
    name: "Background Studio",
    icon: "🖼",
    status: "active",
    component: BackgroundPanel,
    description: "Remove, replace and enhance backgrounds",
  },
  {
    id: "pose",
    name: "Pose Generator",
    icon: "🧍",
    status: "coming_soon",   // locked card rendered automatically
    component: null,
    description: "Generate poses from one photo",
  },
  {
    id: "headshot",
    name: "Headshot Generator",
    icon: "📸",
    status: "coming_soon",
    component: null,
    description: "Turn casual photos into professional headshots",
  },
]
```

**To add a new panel:** add one object, set `status: "coming_soon"` until ready, then flip to `"active"` and attach the component.

---

### Action Registry
`src/registry/actions.js`

Every operation in the app — across all panels — is registered here with its token cost and handler function. This is the single source of truth for pricing.

```js
export const actions = [
  // Retouch Panel
  {
    id: "quick_enhance",
    panel: "retouch",
    name: "Quick Enhance",
    tokenCost: 1,
    outputType: "flat",
    handler: quickEnhanceHandler,
  },
  {
    id: "advanced_edit",
    panel: "retouch",
    name: "Advanced Edit",
    tokenCost: 2,
    outputType: "layered",   // layers returned for live preview; final download is flat
    handler: advancedRetouchHandler,
  },
  {
    id: "batch_retouch",
    panel: "retouch",
    name: "Batch Retouch",
    tokenCost: 1,           // per image
    outputType: "flat",
    handler: batchRetouchHandler,
  },

  // Background Panel
  {
    id: "bg_remove",
    panel: "background",
    name: "Background Removal",
    tokenCost: 1,
    outputType: "png",
    handler: bgRemoveHandler,
  },
  {
    id: "bg_replace_solid",
    panel: "background",
    name: "Background Replace",
    tokenCost: 1,
    outputType: "flat",
    handler: bgReplaceSolidHandler,
  },
  {
    id: "bg_ai_generate",
    panel: "background",
    name: "AI Background",
    tokenCost: 2,
    outputType: "flat",
    handler: bgAiGenerateHandler,
  },
  {
    id: "bg_blur",
    panel: "background",
    name: "Background Blur",
    tokenCost: 1,
    outputType: "flat",
    handler: bgBlurHandler,
  },
  {
    id: "bg_expand",
    panel: "background",
    name: "Smart Expand",
    tokenCost: 2,
    outputType: "flat",
    handler: bgExpandHandler,
  },
]
```

**To change a token cost:** edit one `tokenCost` value. The UI, validation, and deduction logic all read from this registry automatically.

**To add a new action:** add one object with a handler function. It becomes available to its panel immediately.

---

### AI Model Registry
`src/registry/models.js`

Maps actions to their underlying AI models and providers. Swapping a model or provider requires changing one entry — no panel or action code changes needed.

```js
export const models = [
  {
    id: "retouch4me_portrait",
    provider: "retouch4me",
    model: null,              // Retouch4me handles routing internally
    actions: ["quick_enhance", "advanced_flat", "advanced_layered", "batch_retouch"],
    apiBase: "https://retoucher.hz.labs.retouch4.me/api/v1",
  },
  {
    id: "rembg",
    provider: "replicate",
    model: "cjwbw/rembg",
    actions: ["bg_remove"],
    version: "latest",
  },
  {
    id: "sdxl",
    provider: "replicate",
    model: "stability-ai/sdxl",
    actions: ["bg_ai_generate"],
    version: "latest",
  },
  {
    id: "sd_inpainting",
    provider: "replicate",
    model: "stability-ai/stable-diffusion-inpainting",
    actions: ["bg_expand"],
    version: "latest",
  },
  {
    id: "depth_blur",
    provider: "replicate",
    model: "custom/depth-blur-pipeline",
    actions: ["bg_blur"],
    version: "latest",
  },
]
```

**To swap an AI model:** change `model` and `version` in one entry. Everything else stays the same.

**To add a new provider:** add a new entry with a new `provider` value, then add a matching provider handler in `src/lib/providers/`.

---

### Preset Registry
`src/registry/presets.js`

System-level presets that appear in Quick Enhance mode. The UI reads this file and renders the preset cards automatically — no component changes needed to add a new look.

```js
export const systemPresets = [
  {
    id: "natural",
    panel: "retouch",
    name: "Natural",
    icon: "👤",
    description: "Subtle cleanup, everyday portraits",
    tokenCost: 1,
    payload: {
      mode: "professional",
      tasks: [
        { Plugin: "Heal", Scale: 0, Alpha1: 0.8 },
        { Plugin: "Skin Tone", Scale: 0, Alpha1: 1.0, Alpha2: 1.0 },
        { Plugin: "Eye Vessels", Scale: 0, Alpha1: 1.0 },
      ]
    }
  },
  {
    id: "glam",
    panel: "retouch",
    name: "Glam",
    icon: "💄",
    description: "Bold enhancement for beauty and fashion",
    tokenCost: 1,
    payload: {
      mode: "professional",
      tasks: [
        { Plugin: "Heal", Scale: 0, Alpha1: 1.0 },
        { Plugin: "Dodge Burn", Scale: 2, Alpha1: 1.0, Alpha2: 0.2 },
        { Plugin: "White Teeth", Scale: 0, Alpha1: 0.5, Alpha2: 0.5 },
        { Plugin: "Eye Brilliance", Scale: 0, Alpha1: 0.85 },
      ]
    }
  },
  {
    id: "ecommerce",
    panel: "retouch",
    name: "E-commerce",
    icon: "🛍️",
    description: "Product and fabric cleanup",
    tokenCost: 1,
    payload: {
      mode: "professional",
      tasks: [
        { Plugin: "Dust", Scale: 3, Alpha1: 1.0 },
        { Plugin: "Clean Backdrop", Scale: 0, Alpha1: 1.0 },
        { Plugin: "Fabric", Scale: 0, Alpha1: 0.75 },
      ]
    }
  },
]
```

**To add a new Quick Enhance look:** add one object to this array. It appears as a new card in the UI automatically.

---

### How It All Connects

```
User clicks "Natural" preset card
    → UI reads systemPresets registry → finds "natural"
        → reads tokenCost → checks user balance
            → reads actions registry → finds "quick_enhance" handler
                → reads models registry → routes to retouch4me provider
                    → serverless function calls Retouch4me API
                        → result saved to shared Supabase outputs/
                            → UI shows before/after
```

### Extensibility Summary

| Task | What You Do |
|---|---|
| Add a new panel | Add 1 object to `panels.js` |
| Add a new preset | Add 1 object to `presets.js` |
| Add a new action | Add 1 object to `actions.js` + handler file |
| Change a token cost | Edit 1 `tokenCost` value in `actions.js` |
| Swap an AI model | Edit 1 `model` value in `models.js` |
| Add a new AI provider | Add entry to `models.js` + provider handler |
| Mark panel as beta | Set `status: "beta"` in `panels.js` |
| Hide a panel temporarily | Set `status: "coming_soon"` in `panels.js` |

---

## Shared Storage

All panels share the same Supabase Storage buckets. The `panel` field in the jobs table identifies which tool processed each file.

```
supabase/storage/
├── inputs/
│   └── {user_id}/
│       └── {job_id}_original.jpg     ← all panels upload here
│
└── outputs/
    └── {user_id}/
        └── {job_id}_result.jpg       ← all panels save results here
```

**Rules:**
- Every panel reads from `inputs/{user_id}/` and writes to `outputs/{user_id}/`
- Files in `inputs` are **session-only** — cleaned up when the user's session ends or they leave the panel
- Files in `outputs` are kept for **7 days** then auto-deleted via Supabase storage policy
- Retouch4me results (24hr expiry) are fetched and saved to Supabase `outputs` immediately after completion
- Replicate results follow the same pattern — fetched and saved to Supabase immediately

**Supabase Storage Buckets:**

| Bucket | Access | Purpose |
|---|---|---|
| `inputs` | Private (user-scoped) | All uploaded source images |
| `outputs` | Private (user-scoped) | All processed results |
| `backgrounds` | Public | Built-in stock background library |
| `thumbnails` | Private (user-scoped) | Preview thumbnails for job history |

---

## Database Schema

### users
| Column | Type | Notes |
|---|---|---|
| id | uuid | Supabase auth user ID |
| email | text | |
| token_balance | integer | Available tokens |
| package_id | text | starter / basic / standard / pro / studio |
| package_set_at | timestamp | When the package was last assigned |
| created_at | timestamp | |

### token_vouchers
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| code | text unique | e.g. `SMTCH-8X2K-9QLP` |
| package_id | text | Which package this voucher unlocks |
| value | integer | How many tokens the code adds |
| is_used | boolean | Whether code has been redeemed |
| used_by | uuid | FK to users |
| used_at | timestamp | When it was redeemed |
| created_at | timestamp | When admin generated it |

### presets
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK to users |
| name | text | Preset display name |
| panel | text | retouch / background |
| payload | jsonb | Full plugin config |
| layer_opacities | jsonb | Per-layer opacity values |
| created_at | timestamp | |

### jobs
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK to users |
| panel | text | retouch / background / pose etc. |
| operation | text | quick_enhance / advanced / bg_remove etc. |
| status | text | pending / processing / completed / failed |
| external_job_id | text | Retouch4me or Replicate job ID |
| input_path | text | Supabase storage path in `inputs` bucket |
| output_path | text | Supabase storage path in `outputs` bucket |
| tokens_used | integer | Token cost of this specific job |
| created_at | timestamp | |

### batch_jobs
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| user_id | uuid | FK to users |
| preset_id | uuid | FK to presets |
| panel | text | Which panel ran the batch |
| total_images | integer | |
| completed_images | integer | |
| tokens_used | integer | Total tokens deducted for batch |
| status | text | running / completed / failed |
| output_zip_path | text | Supabase storage path in `outputs` bucket |
| created_at | timestamp | |

---

## Token System

Smalltouch Studio uses a **physical cash voucher system** — no online payments. Tokens are the only currency in the app.

### How It Works

```
Admin generates token codes (admin dashboard)
    → Codes printed or shared with customer
        → Customer pays cash
            → Customer enters code in app
                → Supabase validates code
                    → Tokens added to user balance
                        → Each operation deducts tokens automatically
```

### Token Code Format
```
SMTCH-XXXX-XXXX
e.g. SMTCH-8X2K-9QLP
```

### Token Redemption Flow
1. User visits **My Tokens** page
2. Enters voucher code
3. App calls `/api/tokens/redeem` (serverless function)
4. Server checks code exists, is unused, belongs to no one
5. Marks code as used, credits `token_balance` on user record
6. User sees updated balance immediately

### Admin Token Management
Admins access a protected `/admin` dashboard to:
- Generate a batch of token codes (set quantity + value per code)
- Export codes as CSV for printing
- View redeemed vs unused codes
- Look up which user redeemed a specific code
- View each user's current balance

### Low Token Warning
- App shows warning banner when balance drops below 5 tokens
- Each operation shows token cost before confirming
- If balance is insufficient, operation is blocked with a clear message

---

### Retouch4me Cloud API
- Base URL: `https://retoucher.hz.labs.retouch4.me/api/v1`
- Auth: `X-Retouch-Token` header (server-side only)
- Key endpoints: `/retoucher/start`, `/retoucher/status/{id}`, `/retoucher/getFile/{id}`, `/api/v1/balance`
- Output: flat JPEG or layered ZIP
- Results expire after **24 hours**
- Cost: ~$0.10 per image

### Replicate API
- Auth: `Authorization: Token <key>` header (server-side only)
- Models to integrate:
  - Background removal: `cjwbw/rembg`
  - Image generation: `stability-ai/sdxl`
  - Inpainting: `stability-ai/stable-diffusion-inpainting`
- Polling: same pattern as Retouch4me — submit, poll, fetch

---

## Development Phases

### Phase 1 — Foundation *(Weeks 1–2)*
- [x] Project setup (React + Vite + Tailwind)
- [x] Supabase auth (email/password)
- [x] Registry system scaffolding (panels, actions, models, presets, packages)
- [x] Basic dashboard layout driven by panels registry
- [x] Vercel deployment pipeline

### Phase 2 — Retouching Panel: One Click Enhance *(Weeks 3–5)*
- [x] Upload component with drag & drop
- [x] Preset card grid with category filter bar
- [x] Inline before/after slider on preset card click
- [x] Vercel serverless functions for Retouch4me API proxy
- [x] Job polling and status tracking
- [x] Before/after result viewer
- [x] Single image download
- [x] Admin preset editor (`/admin/presets`) — upload before/after images, set plugin config

### Phase 3 — Advanced Edit *(Weeks 6–8)*
- [x] Plugin checkbox + intensity mode controls (Subtle / Normal / Extreme)
- [x] Start Editing → sends image + plugin config → receives layered ZIP
- [x] JSZip-based ZIP download of layer output
- [x] Layer opacity sliders with CSS blend mode compositing (`LayerControls.jsx`)
- [x] ZIP download for Photoshop-compatible layered output
- [ ] Sharp server-side compositing for final flat download
- [ ] Save as Preset from current layer state
- [ ] Saved preset immediately available as batch preset

### Phase 4 — Batch Processing *(Weeks 9–10)*
- [x] Multi-file upload
- [x] Batch job queue management
- [x] Concurrent polling per image (Promise.allSettled)
- [x] Per-image progress + status indicators
- [x] ZIP download of all completed results (JSZip)

### Phase 5 — Background Panel *(Weeks 11–13)*
- [x] Background removal via Replicate (`cjwbw/rembg`)
- [x] Solid color + gradient background replacement (client-side canvas)
- [x] AI background generation with text prompt (Replicate SDXL)
- [x] Stock background library (Supabase `backgrounds` bucket)
- [x] Canvas compositing preview (live, real-time)
- [x] Background blur (blur amount slider)
- [x] Smart background expand with AI inpainting
- [x] PNG export with transparency

### Phase 6 — Token System, Packages & Admin *(Week 14)*
- [x] Package registry (`packages.js`) with all five tiers
- [x] Access control library (`access.js`) — `canUsePanel`, `canUseAction`, `getBatchLimit`
- [x] Token voucher generation tied to specific package (admin dashboard)
- [x] Token redemption flow — applies both package and tokens on redeem
- [x] Package upgrade logic — tokens added, access unlocked immediately
- [x] Token balance display in navbar
- [x] Per-operation token deduction with automatic refund on failure
- [x] Locked action UI states with upgrade prompts
- [x] Admin dashboard (generate, export, track codes, manage users)
- [x] CSV export of token codes for printing

### Phase 6b — Modular Panel Architecture *(Post-Phase 6 refactor)*
- [x] `PanelShell` shared 3-column layout wrapper (Library | Tools | Results)
- [x] `LibraryPanel` shared upload + image grid — `mode="multi"` or `mode="single"`
- [x] `ResultsPanel` shared job-list results — generic, works for any panel
- [x] Both active panels (Retouch, Background) migrated to use `PanelShell`
- [x] Adding a new panel now only requires implementing the center tools section

### Phase 7 — Polish & Launch *(Weeks 15–16)*
- [x] Mobile responsive UI (3-column → tab-based on mobile)
- [x] Error handling with token refund on failure
- [x] Loading/processing states and progress bars
- [x] Onboarding modal for new users
- [ ] Beta testing
- [ ] Production launch

### Phase 8 — Future Panels *(Post-launch)*
- [ ] Pose Generator panel
- [ ] Outfit Changer panel
- [ ] Color Grading Studio
- [ ] Headshot Generator

---

## Token Packages

Packages control both **how many tokens** a user gets and **which panels and actions** they can access. All package definitions live in one registry file — updating a package requires editing a single object, no database migrations needed.

---

### Package Registry
`src/registry/packages.js`

```js
export const packages = [
  {
    id: "starter",
    name: "Starter",
    icon: "🌱",
    tokens: 10,
    price: "$2",
    color: "#22c55e",
    panels: ["retouch"],
    actions: [
      "quick_enhance",
      "batch_retouch",
    ],
    limits: {
      maxBatchSize: 5,
      maxFileSizeMB: 10,
    },
    description: "Perfect for trying out portrait retouching",
  },
  {
    id: "basic",
    name: "Basic",
    icon: "⭐",
    tokens: 50,
    price: "$8",
    color: "#3b82f6",
    panels: ["retouch", "background"],
    actions: [
      "quick_enhance",
      "batch_retouch",
      "advanced_edit",
      "bg_remove",
      "bg_replace_solid",
      "bg_blur",
    ],
    limits: {
      maxBatchSize: 20,
      maxFileSizeMB: 50,
    },
    description: "Retouch and background tools for everyday use",
  },
  {
    id: "standard",
    name: "Standard",
    icon: "💎",
    tokens: 100,
    price: "$15",
    color: "#a855f7",
    panels: ["retouch", "background"],
    actions: [
      "quick_enhance",
      "batch_retouch",
      "advanced_edit",
      "bg_remove",
      "bg_replace_solid",
      "bg_blur",
      "bg_ai_generate",
      "bg_expand",
    ],
    limits: {
      maxBatchSize: 50,
      maxFileSizeMB: 100,
    },
    description: "Full retouch and background suite",
  },
  {
    id: "pro",
    name: "Pro",
    icon: "🚀",
    tokens: 300,
    price: "$40",
    color: "#f59e0b",
    panels: ["retouch", "background"],
    actions: "all",        // all current actions unlocked
    limits: {
      maxBatchSize: 200,
      maxFileSizeMB: 100,
    },
    description: "Everything unlocked for professional workflows",
  },
  {
    id: "studio",
    name: "Studio",
    icon: "🏆",
    tokens: 1000,
    price: "$120",
    color: "#ec4899",
    panels: "all",         // all panels including future ones on launch
    actions: "all",
    limits: {
      maxBatchSize: 999,
      maxFileSizeMB: 100,
    },
    description: "Full platform access including all future panels",
  },
]
```

**To add a new package:** add one object to this array.
**To update pricing or tokens:** edit the relevant fields — no database migration needed.
**To add a new panel to a package:** add the panel id to the `panels` array.
**To grant access to a new action:** add the action id to the `actions` array.

---

### Package Comparison

| Feature | Starter 🌱 | Basic ⭐ | Standard 💎 | Pro 🚀 | Studio 🏆 |
|---|---|---|---|---|---|
| **Price** | $2 | $8 | $15 | $40 | $120 |
| **Tokens** | 10 | 50 | 100 | 300 | 1000 |
| **Retouch Panel** | ✅ | ✅ | ✅ | ✅ | ✅ |
| Quick Enhance | ✅ | ✅ | ✅ | ✅ | ✅ |
| Advanced Edit | ❌ | ✅ | ✅ | ✅ | ✅ |
| Batch Processing | 5 max | 20 max | 50 max | 200 max | Unlimited |
| **Background Panel** | ❌ | ✅ | ✅ | ✅ | ✅ |
| BG Remove & Blur | ❌ | ✅ | ✅ | ✅ | ✅ |
| AI BG Generate | ❌ | ❌ | ✅ | ✅ | ✅ |
| Smart BG Expand | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Future Panels** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

### Per-Operation Token Costs

Each action deducts tokens from the user's balance. Costs are defined in `actions.js` registry.

**Retouching Panel**

| Operation | Tokens |
|---|---|
| One Click Enhance | 1 token |
| Advanced Edit (returns layers for live preview, flat on download) | 2 tokens |
| Batch Retouch (per image, flat output) | 1 token |

**Background Panel**

| Operation | Tokens |
|---|---|
| Background Removal | 1 token |
| Background Replacement (solid/gradient) | 1 token |
| AI Background Generation | 2 tokens |
| Background Blur | 1 token |
| Smart Background Expand | 2 tokens |

**Future Panels**

| Operation | Tokens |
|---|---|
| Pose Generator (per pose) | 3 tokens |
| Outfit Changer | 3 tokens |
| Headshot Generator (per headshot) | 4 tokens |
| Color Grading | 1 token |

---

### Access Control
`src/lib/access.js`

Single file that enforces package permissions everywhere in the app. No scattered permission logic in components.

```js
import { packages } from "../registry/packages"

export function canUsePanel(user, panelId) {
  const pkg = packages.find(p => p.id === user.package_id)
  if (!pkg) return false
  if (pkg.panels === "all") return true
  return pkg.panels.includes(panelId)
}

export function canUseAction(user, actionId) {
  const pkg = packages.find(p => p.id === user.package_id)
  if (!pkg) return false
  if (pkg.actions === "all") return true
  return pkg.actions.includes(actionId)
}

export function getBatchLimit(user) {
  const pkg = packages.find(p => p.id === user.package_id)
  return pkg?.limits.maxBatchSize ?? 0
}

export function getFileSizeLimit(user) {
  const pkg = packages.find(p => p.id === user.package_id)
  return pkg?.limits.maxFileSizeMB ?? 0
}

export function getRequiredPackage(panelId) {
  // Returns the minimum package that unlocks a given panel
  return packages.find(p =>
    p.panels === "all" || p.panels.includes(panelId)
  )
}
```

---

### What Users See When Locked

**Locked panel card on home page:**
```
┌────────────────┐
│  🖼            │
│  Background    │
│  Studio        │
│                │
│  🔒 Basic+     │  ← shows minimum package required
└────────────────┘
```

**Locked action button in panel:**
```
┌─────────────────────────┐
│  Advanced Layered  🔒   │
│  Requires Standard      │  ← tooltip on hover
└─────────────────────────┘
```

**Batch queue limit reached:**
```
⚠️ Queue full (5/5)
Upgrade to Basic for up to 20 images per batch
```

**Insufficient tokens:**
```
❌ Not enough tokens
This action costs 2 tokens. You have 1 remaining.
Redeem a voucher to continue.
```

---

### Package Upgrade Behaviour

When a user redeems a higher-tier voucher:
- `package_id` is updated to the new package
- New tokens are **added** to existing balance (not replaced)
- Newly unlocked panels and actions become available immediately
- All previous results remain accessible in history
- Batch limits update immediately

---

### Admin Package Controls

From the `/admin` dashboard, admins can:
- Generate voucher codes tied to a specific package and token value
- Export codes as CSV for printing and cash sale
- View all redeemed and unused codes
- Look up which user redeemed a code
- Manually assign or upgrade a user's package
- View each user's current package and token balance
- Edit package definitions via `packages.js` registry without any DB changes

---

## UI Design System

Design inspiration: **OpenArt.ai** — dark theme, card-based layout, clean navigation, image-forward aesthetic.

---

### Design Principles

- **Dark first** — dark background makes retouched photos stand out and feels premium
- **Image forward** — photos are always the hero, UI steps back
- **Card based** — every tool, preset, and result is a scannable card
- **Progressive disclosure** — simple by default, advanced on demand
- **Mobile friendly** — 3-column desktop collapses to tabbed mobile layout

---

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#0d0d0d` | Main background |
| `--bg-secondary` | `#1a1a1a` | Cards, panels |
| `--bg-tertiary` | `#242424` | Inputs, hover states |
| `--accent` | `#a855f7` | Primary CTA, highlights |
| `--accent-soft` | `#7c3aed` | Hover on accent |
| `--text-primary` | `#f5f5f5` | Headings, labels |
| `--text-secondary` | `#a3a3a3` | Subtext, descriptions |
| `--success` | `#22c55e` | Completed jobs |
| `--warning` | `#f59e0b` | Processing, queued |
| `--error` | `#ef4444` | Failed jobs |
| `--border` | `#2a2a2a` | Card borders, dividers |

---

### Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Display heading | Syne | 700 | 2.5rem |
| Section heading | Syne | 600 | 1.5rem |
| Card title | Inter | 500 | 1rem |
| Body text | Inter | 400 | 0.875rem |
| Caption / meta | Inter | 400 | 0.75rem |
| Token badge | Inter | 700 | 0.75rem |

---

### Global Layout

```
┌─────────────────────────────────────────────────┐
│  NAVBAR                                         │
│  Logo        Panel Nav        Token Balance 👤  │
├─────────────────────────────────────────────────┤
│                                                 │
│               PAGE CONTENT                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Bottom nav on mobile:**
```
[🏠 Home] [✨ Retouch] [🖼 Background] [🕐 History] [👤 Account]
```

---

### Home Page

The landing page every user sees after login. Inspired by OpenArt's hero + card grid layout.

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   What would you like to do today?  ✨          │
│                                                 │
│  ┌────────────┐  ┌────────────┐                 │
│  │  🎨        │  │  🖼        │                 │
│  │  Retouch   │  │ Background │                 │
│  │  Picture   │  │  Studio    │                 │
│  └────────────┘  └────────────┘                 │
│                                                 │
│  ┌────────────┐  ┌────────────┐                 │
│  │  🧍        │  │  📸        │                 │
│  │   Pose     │  │  Headshot  │                 │
│  │ Generator  │  │  (Soon)  🔒│                 │
│  └────────────┘  └────────────┘                 │
│                                                 │
│  ── Featured Actions ──────────────────────     │
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ [thumb]  │ │ [thumb]  │ │ [thumb]  │        │
│  │ Natural  │ │  Glam    │ │E-commerce│        │
│  │ 1 token  │ │ 1 token  │ │ 1 token  │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                 │
│  ── Recent Results ────────────────────────     │
│  [thumb] [thumb] [thumb] [thumb]  →             │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Home page sections:**
- Hero question with action cards (panels)
- Coming soon panels show lock icon, greyed out
- Featured Actions — 3 most popular Quick Enhance presets
- Recent Results — last 4 processed images, quick re-download
- Clicking any action card navigates to the relevant panel

---

### Panel Page Layout — 3 Column

**Implemented as `src/components/shared/PanelShell.jsx`.** Used by all active panels (Retouch, Background, future panels). Same shell, different center content. New panels only need to implement the center tools column — Library and Results are provided automatically.

```
┌────────────┬──────────────────────┬────────────┐
│  LIBRARY   │    PANEL / TOOLS     │  RESULTS   │
│  ────────  │  ──────────────────  │  ────────  │
│  [+ Upload]│  [Quick Enhance]     │  Completed │
│            │  [Advanced ▾]        │            │
│  [🔍 Search│                      │  ✅[thumb] │
│            │  ── Preset Cards ──  │  ✅[thumb] │
│  [thumb]   │  ┌──────┐ ┌──────┐  │  ⏳[thumb] │
│  [thumb]   │  │Nature│ │Glam  │  │  ⏸[thumb] │
│  [thumb]   │  └──────┘ └──────┘  │            │
│  [thumb]   │                      │  ────────  │
│  [thumb]   │  Selected: Natural   │  [thumb]   │
│  [thumb]   │  Cost: 1 token  ✓    │  [thumb]   │
│            │                      │  [thumb]   │
│  ────────  │  [▶ Process Image]   │            │
│  BATCH     │                      │  ────────  │
│  QUEUE     │  ── Processing ──    │ [Download  │
│            │  [████░░░] 60%       │   All  ↓]  │
│  ⏳ img3   │  Applying Heal...    │            │
│  ⏸ img4   │                      │            │
│  ⏸ img5   │                      │            │
└────────────┴──────────────────────┴────────────┘
```

**Column widths:**
- Left Library: `240px` fixed
- Center Panel: flexible, takes remaining space
- Right Results: `280px` fixed

---

### Left Column — Library Panel

```
┌────────────────────────┐
│  [+ Upload Images]     │
│  [🔍 Search...]        │
│                        │
│  All Images  (12)      │
│  ┌──────┐  ┌──────┐   │
│  │      │  │      │   │
│  │ img1 │  │ img2 │   │
│  └──────┘  └──────┘   │
│  ┌──────┐  ┌──────┐   │
│  │      │  │      │   │
│  │ img3 │  │ img4 │   │
│  └──────┘  └──────┘   │
│                        │
│  ── Batch Queue ──     │
│                        │
│  ⏳ img3  [remove ×]   │
│  ⏸ img4  [remove ×]   │
│  ⏸ img5  [remove ×]   │
│                        │
│  [▶ Start Batch]       │
└────────────────────────┘
```

- Click image → loads into center panel
- Drag image → drops into batch queue
- Images shared across all panels (same Supabase `inputs/` bucket)
- Upload button always visible at top
- Batch queue section collapses when empty

---

### Center Column — Panel in Action

The center column is a single scrollable column with two stacked sections.

**One Click Enhance — idle (image loaded):**
```
┌──────────────────────────────────┐
│  ── One Click Enhance ──         │
│                                  │
│  [All] [Portrait] [Beauty]       │
│  [Editorial] [E-commerce]        │
│                                  │
│  ┌────────┐ ┌────────┐ ┌───────┐ │
│  │▶ b/a   │ │▶ b/a   │ │▶ b/a  │ │
│  │Natural │ │Glam    │ │Fresh  │ │
│  │1 token │ │1 token │ │1 token│ │
│  └────────┘ └────────┘ └───────┘ │
│  ┌────────┐ ┌────────┐ ┌───────┐ │
│  │▶ b/a   │ │▶ b/a   │ │▶ b/a  │ │
│  │Matte   │ │Sharp   │ │E-com  │ │
│  │1 token │ │1 token │ │1 token│ │
│  └────────┘ └────────┘ └───────┘ │
│                                  │
│  Selected: Natural  · 1 token    │
│  [▶ Enhance Now]                 │
└──────────────────────────────────┘
```

**Preset card clicked — inline before/after preview:**
```
┌────────────────────────────────┐
│  ┌────────────────────────┐    │
│  │  BEFORE  │◀▶│  AFTER   │    │  ← drag divider
│  │  [photo] │  │ [photo]  │    │
│  └────────────────────────┘    │
│  Natural — Subtle cleanup      │
│  Portrait · 1 token            │
│                                │
│  [Select This Preset]  [✕]     │
└────────────────────────────────┘
```

**One Click Enhance — processing:**
```
┌──────────────────────────────────┐
│  Processing: Natural             │
│                                  │
│  [████████░░░░] 65%              │
│  Applying Skin Tone...           │
└──────────────────────────────────┘
```

**Advanced Edit — image loaded, plugins selected:**
```
┌──────────────────────────────────┐
│  ── Advanced Edit ──             │
│                                  │
│  ┌────────────┬────────────┐     │
│  │  Original  │   Edited   │     │
│  │   [photo]  │  [photo]   │     │
│  └────────────┴────────────┘     │
│                                  │
│  ✅ Heal                         │
│  ✅ Dodge Burn                   │
│  ✅ Skin Tone                    │
│  ☐  Eye Vessels                  │
│  ☐  Face Lifting                 │
│  ☐  White Teeth                  │
│                                  │
│  Intensity:                      │
│  ○ Subtle   ● Normal   ○ Extreme │
│                                  │
│  Cost: 2 tokens                  │
│  [▶ Start Editing]               │
└──────────────────────────────────┘
```

**Advanced Edit — layers returned, opacity controls active:**
```
┌──────────────────────────────────┐
│  ┌────────────┬────────────┐     │
│  │  Original  │   Edited   │     │
│  │   [photo]  │  [live]    │     │  ← updates as sliders move
│  └────────────┴────────────┘     │
│                                  │
│  ── Layers ──                    │
│  Heal        [━━━━●──────] 65%   │
│  Dodge Burn  [━━━━━━●────] 80%   │
│  Skin Tone   [━━━━━━━━●──] 90%   │
│                                  │
│  [Save as Preset]  [↓ Download]  │
└──────────────────────────────────┘
```

**Save as Preset prompt:**
```
┌──────────────────────────────────┐
│  Name this preset:               │
│  [________________________]      │
│                                  │
│  [Save & Add to Batch Queue]     │
└──────────────────────────────────┘
```

---

### Right Column — Results Panel

```
┌──────────────────────┐
│  Results  (8)        │
│  ── ── ── ── ──      │
│                      │
│  ✅ Natural          │
│  ┌────────────────┐  │
│  │  [before/after]│  │
│  │    thumbnail   │  │
│  └────────────────┘  │
│  [↓ Download]        │
│                      │
│  ✅ Glam             │
│  ┌────────────────┐  │
│  │  [thumbnail]   │  │
│  └────────────────┘  │
│  [↓ Download]        │
│                      │
│  ⏳ E-commerce       │
│  [████░░░░░] 40%     │
│                      │
│  ❌ Sharp  [Retry]   │
│                      │
│  ── ── ── ── ──      │
│  [↓ Download All]    │
└──────────────────────┘
```

- Each result shows preset name used
- Click thumbnail → expands full before/after slider modal
- Failed results show retry button
- Download All packages all completed results as ZIP

---

### Mobile Layout

On screens under 768px the 3-column layout collapses to a tabbed view:

```
┌─────────────────────────────┐
│  Navbar                     │
├─────────────────────────────┤
│  [Library] [Tools] [Results]│
├─────────────────────────────┤
│                             │
│   Active tab content        │
│                             │
└─────────────────────────────┘
[🏠] [✨] [🖼] [🕐] [👤]
```

- Library tab shows uploaded images + batch queue
- Tools tab shows the panel in action (center column)
- Results tab shows completed thumbnails + download
- Bottom nav for switching panels

---

### Key UI Components

| Component | Description |
|---|---|
| `PanelCard` | Home page action cards with icon, name, coming soon state |
| `PresetCard` | One Click Enhance cards with before thumbnail, name, token cost, inline before/after on click |
| `PresetCategoryFilter` | Filter bar above preset grid — All + category tag buttons |
| `PresetBeforeAfter` | Inline before/after drag-divider shown when a preset card is clicked |
| `LibraryGrid` | Image thumbnail grid with drag-to-batch support |
| `BatchQueue` | Ordered list of queued images with status indicators |
| `PluginControl` | Single plugin row with checkbox + Alpha1/Alpha2 sliders + Scale selector |
| `LayerOpacitySlider` | Per-layer opacity slider shown after layers are returned from API |
| `AdvancedEditViewer` | Side-by-side original + edited image panel (CSS blend mode compositing) |
| `SavePresetPrompt` | Name input + save button that creates a preset from current layer state |
| `JobProgressBar` | Animated progress bar with step label |
| `ResultCard` | Result thumbnail with before/after, download, retry |
| `BeforeAfterSlider` | Drag divider comparing original and retouched |
| `TokenCostBadge` | Small pill showing token cost of an action |
| `TokenBalancePill` | Navbar token balance with low-balance warning color |

---

### Navigation Flow

```
Login
  └── Home
        ├── Click "Retouch Picture"
        │     └── Retouch Panel (3-col)
        │           ├── Library (left) ← shared images
        │           ├── Quick Enhance or Preset Builder (center)
        │           └── Results (right)
        │
        ├── Click "Background Studio"
        │     └── Background Panel (3-col)
        │           ├── Library (left) ← same shared images
        │           ├── Background Tools (center)
        │           └── Results (right)
        │
        ├── Click Featured Action (e.g. "Natural")
        │     └── Retouch Panel opens with Natural preset pre-selected
        │
        └── Click recent result thumbnail
              └── Opens full before/after modal with download option
```

---

```
smalltouch-studio/
├── public/
├── src/
│   ├── registry/                     ← MODULAR CORE
│   │   ├── panels.js                 ← all panels registered here
│   │   ├── actions.js                ← all actions + token costs
│   │   ├── models.js                 ← all AI models + providers
│   │   ├── presets.js                ← system preset definitions
│   │   └── packages.js               ← all token packages + access rules
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx
│   │   │   ├── BottomNav.jsx         ← mobile bottom navigation
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── AdminRoute.jsx
│   │   ├── retouch/
│   │   │   ├── QuickEnhance.jsx      ← preset card grid + category filter
│   │   │   ├── AdvancedEdit.jsx      ← plugin checkboxes + intensity + ZIP download
│   │   │   ├── LayerControls.jsx     ← per-layer opacity sliders
│   │   │   └── PlaygroundPanel.jsx   ← image preview + batch queue + process button
│   │   ├── background/
│   │   │   ├── BackgroundTools.jsx   ← remove/replace/blur/expand controls
│   │   │   └── CanvasPreview.jsx     ← live canvas composition + PNG export
│   │   └── shared/
│   │       ├── PanelShell.jsx        ← 3-column layout (Library|Tools|Results)
│   │       ├── LibraryPanel.jsx      ← shared upload + image grid (mode=multi|single)
│   │       ├── ResultsPanel.jsx      ← shared job-list results panel
│   │       ├── BeforeAfterSlider.jsx
│   │       ├── ProgressBar.jsx
│   │       ├── TokenCostBadge.jsx
│   │       ├── Skeleton.jsx
│   │       └── OnboardingModal.jsx
│   ├── pages/
│   │   ├── DashboardPage.jsx         ← panel cards + featured presets
│   │   ├── RetouchPage.jsx           ← uses PanelShell + retouch tools
│   │   ├── BackgroundPage.jsx        ← uses PanelShell + background tools
│   │   ├── TokensPage.jsx            ← redeem voucher codes
│   │   ├── HelpPage.jsx              ← in-app help per feature
│   │   ├── HistoryPage.jsx           ← shared job history across all panels
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   └── admin/
│   │       ├── AdminPage.jsx         ← admin dashboard (users, codes)
│   │       └── PresetsEditorPage.jsx ← preset editor: upload b/a images, plugin config
│   ├── contexts/
│   │   ├── AuthContext.js
│   │   ├── AuthProvider.jsx
│   │   └── ToastContext.jsx
│   ├── hooks/
│   │   ├── useRetouch.js             ← quick enhance + advanced edit jobs
│   │   ├── useBackground.js          ← Replicate polling
│   │   ├── useAuth.js
│   │   └── useTokens.js
│   ├── lib/
│   │   ├── access.js                 ← canUsePanel, canUseAction, getBatchLimit
│   │   ├── supabase.js
│   │   ├── storage.js                ← shared input/output upload helpers
│   │   └── uploadStore.js            ← IndexedDB session persistence
│   ├── App.jsx
│   └── main.jsx
├── api/
│   ├── retouch/
│   │   ├── start.js
│   │   ├── status.js
│   │   └── download.js
│   ├── background/
│   │   ├── remove.js
│   │   ├── generate.js
│   │   ├── expand.js
│   │   └── status.js
│   ├── tokens/
│   │   ├── redeem.js                 ← validates code, applies package + tokens
│   │   └── generate.js               ← admin: generate codes per package
│   └── admin/
│       └── users.js
├── docs/
│   ├── DEVPLAN.md                    ← this file
│   ├── DEVELOPMENT_RULES.md
│   └── api/                          ← schema docs per endpoint
├── .env.local
├── vercel.json
├── package.json
└── vite.config.js
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Retouch4me (server-side only)
RETOUCH4ME_TOKEN=

# Replicate (server-side only)
REPLICATE_API_KEY=

# Admin (server-side only)
ADMIN_SECRET_KEY=        ← protects /admin routes and token generation
```

---

*Smalltouch Studio — Big results, small touch.*
