import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

const HELP_SECTIONS = [
  {
    id: 'retouch-overview',
    title: 'Retouch Studio — Overview',
    content: `
**What it does**

Retouch Studio uses the Retouch4me Cloud AI to apply professional portrait retouching to your photos. It works on faces, skin, eyes, teeth, and product photography.

There are three ways to use it:
- **One Click Enhance** — pick a preset, click once, get a retouched result
- **Advanced Edit** — choose individual plugins, control intensity, adjust each layer after processing
- **Batch Processing** — apply a saved preset to multiple images at once

**Token costs**
- One Click Enhance: 1 token per image
- Advanced Edit: 2 tokens per session
- Batch Retouch: 1 token per image
    `,
  },
  {
    id: 'one-click-enhance',
    title: 'One Click Enhance',
    content: `
**What it does**

Applies a fixed preset — a combination of AI plugins — to your image in one step. Best for users who want a consistent, fast result without manual controls.

**How to use it**
1. Upload an image using the **Upload Images** button in the left panel
2. Click any preset card to see a before/after preview
3. Click **Select This Preset** to mark it active
4. Click **Enhance Now** — the job starts immediately
5. Watch the progress in the Results panel on the right
6. Download your result when it shows as complete

**Available presets**
| Preset | Best for |
|--------|----------|
| Natural | Everyday portraits — subtle cleanup |
| Glam | Beauty and fashion — bold enhancement |
| Fresh | Lifestyle photography — clean and bright |
| Matte | Editorial work — matte skin finish |
| Sharp | Commercial headshots — crisp look |
| E-commerce | Product photos — fabric and backdrop cleanup |
| Color — Exposure | Fix exposure only |
| Color — Exposure + WB | Fix exposure and white balance |
| Color — Full | Complete AI color correction |

**Expected output**

A single flat JPEG with all retouching applied. The before/after slider in the Results panel lets you compare the original and result.

**Common issues**
- *Enhance Now is greyed out* — select an image from the library first
- *Not enough tokens* — redeem a voucher code on the Tokens page
- *Job failed* — your token is refunded automatically; try again
    `,
  },
  {
    id: 'advanced-edit',
    title: 'Advanced Edit',
    content: `
**What it does**

Gives you full control over which AI plugins are applied and how strong each one is. After processing, you get live layer sliders to fine-tune the result in real time without re-processing.

**How to use it**
1. Select an image from the library
2. Check the plugins you want to apply (e.g. Heal, Dodge Burn, Skin Tone)
3. Pick an **Intensity Mode**: Subtle, Normal, or Extreme
4. Click **Start Editing** — costs 2 tokens
5. Wait for processing (30–60 seconds typically)
6. Use the **Layer sliders** to adjust each effect's strength
7. Click **Save as Preset** to name and save the combination
8. Click **Download** to export the final result

**Intensity modes**
| Mode | Effect | Alpha range |
|------|--------|-------------|
| Subtle | Light touch, natural texture preserved | ~20% of max |
| Normal | Balanced commercial result | ~50–60% of max |
| Extreme | Strong, polished finish | ~90–100% of max |

**Layer sliders**

Each plugin returns as a separate PNG layer. The slider controls how much of that layer is visible (0% = hidden, 100% = full intensity as rendered by the AI).

Blend modes are applied automatically per layer:
- Normal: Heal, Fabric, Eye Vessels, Eye Brilliance, White Teeth
- Soft Light: Dodge Burn, Skin Tone, Portrait Volumes
- Linear Light: Glasses Anti Glare

**Saving a preset**

After adjusting sliders, click **Save as Preset**. The preset captures your exact plugin settings and layer opacities. It then appears in your batch queue, ready to apply to more images.

**Token cost**

2 tokens per Advanced Edit session. Batch processing using a saved preset costs 1 token per image.

**Note on intensity modes**

Changing the intensity mode after layers have been returned requires restarting the edit. The current layers are discarded and a new API call is made. This ensures saved presets always match what you saw in the preview.

**Common issues**
- *Start Editing is greyed out* — check you have at least one plugin selected and enough tokens
- *No layers returned* — the job may have returned a flat JPEG if all plugins failed; check for error messages
    `,
  },
  {
    id: 'batch-processing',
    title: 'Batch Processing',
    content: `
**What it does**

Applies a saved preset to multiple images at once. Each image is processed independently in parallel.

**How to use it**
1. Save a preset from Advanced Edit (or select a One Click Enhance preset)
2. Upload multiple images — they appear in the library grid
3. Drag images into the **Batch Queue** in the left panel, or click to select then add
4. Click **Start Batch** — tokens are deducted per image (1 token each)
5. Watch per-image progress indicators
6. Download all completed results as a ZIP from the Results panel

**Token cost**

1 token per image. Deducted at the start of each image's processing.

**Batch limits by package**
| Package | Max batch size |
|---------|---------------|
| Starter | 5 images |
| Basic | 20 images |
| Standard | 50 images |
| Pro | 200 images |
| Studio | Unlimited |

**Expected output**

All results are flat JPEGs. The Download All button packages them into a ZIP file.

**Common issues**
- *Some jobs failed* — check the Results panel; failed jobs show a Retry button and their tokens are refunded
- *Batch limit reached* — upgrade your package on the Tokens page
    `,
  },
  {
    id: 'plugins',
    title: 'Plugin Reference',
    content: `
These are the AI plugins available in the Retouch Studio.

**Face and portrait plugins**

| Plugin | What it does |
|--------|-------------|
| Heal | Removes blemishes, spots, and small skin distractions |
| Dodge Burn | Shapes light and shadow on skin and facial features |
| Portrait Volumes | Emphasizes face shape and depth |
| Eye Vessels | Reduces visible veins and redness in the whites of the eyes |
| Eye Brilliance | Enhances iris detail and brightens eyes |
| White Teeth | Whitens and brightens teeth |
| Mattifier | Reduces skin shine for a matte finish |
| Skin Tone | Unifies skin color and evens tone transitions |
| Glasses Anti Glare | Removes glare from glasses lenses |

**Product photography plugins**

| Plugin | What it does |
|--------|-------------|
| Clean Backdrop | Cleans background areas in product shots |
| Dust | Removes fine dust particles from products and backdrops |
| Fabric | Softens fabric wrinkles and cleans clothing texture |

**Color correction (One Click Enhance only)**

| Preset | What it does |
|--------|-------------|
| Color — Exposure | Corrects exposure only |
| Color — Exposure + WB | Corrects exposure and white balance |
| Color — Full | Full AI color grade including contrast and saturation |
    `,
  },
  {
    id: 'tokens',
    title: 'Tokens and Packages',
    content: `
**How tokens work**

Every AI action in the app costs tokens. Tokens are deducted immediately when you confirm an action. If the AI job fails for any reason, the token is refunded automatically before the error is shown — you never lose a token on a failed job.

**Getting tokens**

There are no online payments. Purchase a physical voucher with cash from the studio, then redeem the code in **Tokens → Redeem Voucher**.

Voucher codes follow this format: SMTCH-XXXX-XXXX

**Packages**

| Package | Price | Tokens | Retouch | Background |
|---------|-------|--------|---------|------------|
| Starter | $2 | 10 | Quick Enhance + Batch | — |
| Basic | $8 | 50 | Full access | Remove + Blur |
| Standard | $15 | 100 | Full access | Full access |
| Pro | $40 | 300 | Full access | Full access |
| Studio | $120 | 1000 | Full access | Full access + future panels |

When you redeem a higher-tier voucher, your existing token balance is kept and the new tokens are added on top.

**Low balance warning**

A warning appears in the top bar when your balance drops below 5 tokens.

**Per-operation costs**
| Operation | Tokens |
|-----------|--------|
| One Click Enhance | 1 |
| Advanced Edit | 2 |
| Batch Retouch (per image) | 1 |
| Background Removal | 1 |
| Background Blur | 1 |
| AI Background Generation | 2 |
| Smart Background Expand | 2 |
    `,
  },
  {
    id: 'background-overview',
    title: 'Background Studio — Overview',
    content: `
**What it does**

Background Studio lets you remove, replace, blur, and expand the background of any photo using AI. All processing is powered by Replicate AI models.

There are three tools:
- **Replace BG** — swap the background with a solid color, gradient, AI-generated image, or a stock photo
- **Blur BG** — apply a smooth blur to the original background
- **Smart Expand** — extend the canvas outward and fill the new space with AI-generated content

**How to get started**
1. Upload an image using the Upload Image button in the left panel
2. Click **Remove Background** to isolate your subject (1 token)
3. Choose a tool (Replace / Blur / Expand) and configure it
4. Click Apply or Generate to apply the change
5. Download the result as a PNG

**Token costs**
- Background Removal: 1 token
- Replace Background (solid, gradient, stock): 1 token per apply
- AI Background Generation: 2 tokens
- Blur Background: 1 token
- Smart Expand: 2 tokens
    `,
  },
  {
    id: 'background-remove',
    title: 'Remove Background',
    content: `
**What it does**

Removes the background from your image and isolates the subject as a transparent PNG. This is the first step for all background operations.

**How to use it**
1. Upload a JPEG or PNG image
2. Wait for the upload to complete
3. Click **Remove Background · 1 token**
4. Wait 10–30 seconds while the AI processes the image
5. When complete, a green checkmark confirms the background is removed

**Token cost**

1 token. Deducted when you click the button. Refunded automatically if the job fails.

**Expected output**

A PNG with a transparent background. The subject is kept as-is. You can then use any of the three tools to add a new background.

**Tips**
- Works best on images with a clearly defined subject (people, products, objects)
- Complex scenes with similar colors between subject and background may not isolate perfectly
- Hair and fine details are handled well by the rembg model
    `,
  },
  {
    id: 'background-replace',
    title: 'Replace Background',
    content: `
**What it does**

Composites your isolated subject onto a new background. Four background types are available: solid color, gradient, AI-generated, or a stock photo from the library.

**How to use it**
1. Complete background removal first
2. Select the Replace BG tool tab
3. Choose a background type:
   - **Transparent** — shows a checkered pattern (useful for PNG exports)
   - **Solid Color** — pick any color with the color picker
   - **Gradient** — pick two colors and set the angle
   - **AI Generate** — type a prompt and click Generate (2 tokens)
   - **Stock Library** — click any thumbnail from the library
4. Click **Apply · 1 token** to render the result (except AI Generate which renders on its own)
5. Download the final PNG

**Token cost**
- Solid / Gradient / Transparent / Stock: 1 token per Apply
- AI Generate: 2 tokens per generation (separate from Apply)

**Tips**
- The preview updates live on the canvas when you change colors and sliders
- AI-generated backgrounds work best with descriptive prompts: "soft bokeh studio background, light gray"
- Stock backgrounds are loaded from your studio's backgrounds bucket in Supabase
    `,
  },
  {
    id: 'background-blur',
    title: 'Blur Background',
    content: `
**What it does**

Applies a Gaussian blur to the original background, then composites your isolated subject on top. Creates a depth-of-field effect.

**How to use it**
1. Complete background removal first
2. Select the Blur BG tool tab
3. Adjust the blur amount slider (1–20px, default 8)
4. Click **Apply Blur · 1 token**
5. Download the result

**Token cost**

1 token. Deducted when you click Apply Blur. Refunded automatically if the job fails.

**Expected output**

Your subject sharp in the foreground with the original background blurred behind it.

**Tips**
- Higher blur values (15–20) give a strong bokeh effect
- Lower values (2–5) give a subtle depth separation
- The canvas updates immediately — you can see the result without downloading
    `,
  },
  {
    id: 'background-expand',
    title: 'Smart Expand',
    content: `
**What it does**

Extends the canvas in all directions by a set number of pixels, then fills the expanded area with AI-generated content that matches your prompt. Uses Replicate stable-diffusion-inpainting.

**How to use it**
1. Complete background removal first
2. Select the Smart Expand tool tab
3. Set the Padding amount (50–400px, how far to extend each edge)
4. Enter a prompt for what to fill in the expanded area (e.g. "seamless studio background")
5. Click **Expand Canvas · 2 tokens**
6. Wait 20–60 seconds for processing
7. Download the result

**Token cost**

2 tokens. Deducted when you click Expand Canvas. Refunded automatically if the job fails.

**Expected output**

A wider/taller image with your subject in the center and AI-generated content filling the borders.

**Tips**
- Expansion works best on images with clear, well-defined subjects
- Use descriptive prompts that match the existing scene: "clean white studio floor and wall"
- Higher padding values give more room for the AI to fill but take longer
- The image is scaled to fit within 512×512 before sending to the AI to stay within processing limits
    `,
  },
  {
    id: 'admin-dashboard',
    title: 'Admin Dashboard',
    content: `
**What it does**

The admin dashboard at **/admin** lets you generate and manage token voucher codes, view all user accounts, and manually adjust package tiers. It is only accessible to the configured admin account.

**Generate tab — creating voucher codes**

1. Select the package tier for the batch of codes (Starter, Basic, Standard, Pro, or Studio)
2. Enter the quantity of codes to generate (up to 500 at a time)
3. Click **Generate** — codes are created instantly in the database
4. Download the generated codes as a CSV file for printing

Each code follows the format: SMTCH-XXXX-XXXX

**Codes tab — tracking redemptions**

Shows all voucher codes in the system, newest first. Filter between All, Unused, and Used. Each row shows the code, package tier, token value, and redemption status. Use the CSV export to download the full list.

**Users tab — managing accounts**

Shows every registered user with their email address, current token balance, and active package. Use the package dropdown in each row to manually upgrade or change a user's package tier — the change takes effect immediately.

**Access**

Only the admin account can access /admin. Other users who attempt to visit the page are redirected to the dashboard automatically.
    `,
  },
  {
    id: 'admin-presets',
    title: 'Admin — Preset Editor',
    content: `
**What it does**

The Preset Editor lets you manage the preset library shown to users in the One Click Enhance panel. You can create new presets, edit existing ones, hide presets without deleting them, and control the order they appear in.

**How to access it**

Visit /admin/presets or click the Presets link at the top of the Admin dashboard. Only the admin account can access this page.

**How to create a preset**
1. Click **New Preset** in the top-right corner
2. Fill in the required fields:
   - **Key** — a short unique identifier (e.g. \`natural\`, \`glam\`). Cannot be changed after creation.
   - **Name** — the display name shown to users
   - **Icon** — an emoji that represents the preset
   - **Description** — one-line description shown in the preview panel
3. Select one or more categories from Portrait, Beauty, Editorial, E-commerce, Color
4. Set the token cost (default: 1)
5. Enter the Payload JSON — this is the Retouch4me API call configuration
6. Optionally add before/after image URLs for the preview slider
7. Click **Save**

**Payload format**

The payload is sent directly to the Retouch4me API. Example structure:
\`\`\`json
{
  "mode": "professional",
  "tasks": [
    { "Plugin": "Heal", "Scale": 0, "Alpha1": 0.8 },
    { "Plugin": "Skin Tone", "Scale": 0, "Alpha1": 1.0, "Alpha2": 1.0 }
  ]
}
\`\`\`

Refer to the Retouch4me documentation for available plugins and parameter values.

**Before/after images**

These are demo images shown in the preset preview when a user clicks a preset card. Upload sample images to Supabase storage, get their public URL, and paste it into the Before/After URL fields.

**Hiding presets**

Use the eye icon on each row to toggle a preset between active and hidden. Hidden presets are not shown to users but are preserved in the database for later re-activation.

**Fallback behavior**

If no presets exist in the database, the platform automatically falls back to the built-in system presets defined in the codebase. Once you create at least one preset in the database, the database version replaces the built-in list entirely.

**Sort order**

Lower numbers appear first. Set sort_order to control the display sequence. Presets with the same sort_order are shown in creation order.
    `,
  },
  {
    id: 'file-requirements',
    title: 'File Requirements',
    content: `
**Accepted formats**

JPEG, JPG, and PNG files are accepted.

**File size limits**

| Package | Max file size |
|---------|--------------|
| Starter | 10 MB |
| Basic and above | 50–100 MB |

**Resolution limits**

Up to 250 megapixels (very large images). For best results, use files between 5 and 50 MB.

**Tips for best results**
- Portrait photos should have a clearly visible face — the AI works best when the face fills at least 30% of the frame
- Avoid very dark or very overexposed images for face plugins
- Product photos work best with a clean or solid backdrop for the Clean Backdrop and Dust plugins
- Fabric plugin works best on clothing with visible texture or wrinkles
    `,
  },
]

function Accordion({ section }) {
  const [open, setOpen] = useState(false)

  const lines = section.content.trim().split('\n')
  const rendered = lines.map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="font-semibold text-[#f5f5f5] text-sm mt-4 mb-1 first:mt-0">{line.slice(2, -2)}</p>
    }
    if (line.startsWith('| ')) {
      return null
    }
    if (line.startsWith('- *')) {
      const [italic, ...rest] = line.slice(3).split('*')
      return <li key={i} className="text-[#a3a3a3] text-sm ml-4"><em className="text-[#f5f5f5]">{italic}</em>{rest.join('')}</li>
    }
    if (line.startsWith('- ')) {
      return <li key={i} className="text-[#a3a3a3] text-sm ml-4">{line.slice(2)}</li>
    }
    if (line.trim() === '') return <div key={i} className="h-2" />
    return <p key={i} className="text-[#a3a3a3] text-sm">{line}</p>
  })

  const tableLines = lines.filter(l => l.startsWith('| '))
  let tableElements = []
  if (tableLines.length > 2) {
    const headers = tableLines[0].split('|').map(c => c.trim()).filter(Boolean)
    const rows = tableLines.slice(2).map(l => l.split('|').map(c => c.trim()).filter(Boolean))
    tableElements = (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="text-left text-[#a3a3a3] text-xs font-medium py-2 px-3 border-b border-[#2a2a2a]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-[#2a2a2a]/50">
                {row.map((cell, ci) => (
                  <td key={ci} className="text-[#f5f5f5] text-xs py-2 px-3">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#242424] transition-colors"
      >
        <span className="font-display font-semibold text-[#f5f5f5] text-sm">{section.title}</span>
        {open ? <ChevronDown size={16} className="text-[#a3a3a3]" /> : <ChevronRight size={16} className="text-[#a3a3a3]" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#2a2a2a] space-y-1 pt-3">
          {rendered}
          {tableElements}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[#f5f5f5] text-2xl">Help</h1>
        <p className="text-[#a3a3a3] text-sm mt-1">Everything you need to know about using Smalltouch Studio</p>
      </div>
      <div className="space-y-2">
        {HELP_SECTIONS.map(section => (
          <Accordion key={section.id} section={section} />
        ))}
      </div>
    </div>
  )
}
