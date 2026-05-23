import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

const HELP_SECTIONS = [
  {
    id: 'retouch-overview',
    title: 'Retouch Studio — Overview',
    content: `
**What it does**

Retouch Studio applies professional portrait retouching to your photos using AI. It works on faces, skin, eyes, teeth, and product photography.

There are three ways to use it:
- **One Click Enhance** — pick a preset, click once, get a retouched result
- **Advanced Edit** — choose individual plugins and intensity, then download a layers ZIP to finish in Photoshop
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

Lets you choose exactly which AI plugins run and how strong each effect is. The result is a ZIP file containing a separate PNG layer for each plugin, ready to open in Photoshop. You apply the layers yourself, giving you full creative control over blending, order, and opacity.

**How to use it**
1. Select an image from the library
2. Check the plugins you want to apply (e.g. Heal, Dodge Burn, Skin Tone)
3. Pick an **Intensity Mode**: Subtle, Normal, or Extreme
4. Click **Start Editing** — costs 2 tokens
5. Wait for processing (typically 30–60 seconds)
6. Click **Download Layers ZIP** when the green checkmark appears
7. Open the ZIP in Photoshop — each plugin is a named layer

**Intensity modes**
| Mode | Effect |
|------|--------|
| Subtle | Light touch, natural texture preserved |
| Normal | Balanced commercial result |
| Extreme | Strong, polished finish |

**What's in the ZIP**

Each plugin you selected appears as a separate PNG file named after that plugin (e.g. Heal.png, Dodge Burn.png). Open all layers in Photoshop on top of your original image and set the blend modes recommended in the Plugin Reference section.

**Token cost**

2 tokens per Advanced Edit session.

**Common issues**
- *Start Editing is greyed out* — make sure at least one plugin is checked and you have 2 or more tokens
- *Download button doesn't appear* — wait for the green checkmark; if it never appears, check for an error toast and try again
- *Selecting a new image* — this resets the panel so you can run a fresh edit on the new image
    `,
  },
  {
    id: 'batch-processing',
    title: 'Batch Processing',
    content: `
**What it does**

Applies a saved preset to multiple images at once. Each image is processed independently in parallel.

**How to use it**
1. Select a One Click Enhance preset (active preset is shown at the bottom of the Quick Enhance panel)
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

Background Studio lets you remove, replace, blur, and expand the background of any photo using AI.

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

Extends the canvas in all directions by a set number of pixels, then fills the expanded area with AI-generated content that matches your prompt.

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
5. Enter the Payload JSON — this is the AI processing configuration sent to the retouching service
6. Optionally add before/after image URLs for the preview slider
7. Click **Save**

**Payload format**

The payload is sent directly to the retouching service. Example structure:
\`\`\`json
{
  "mode": "professional",
  "tasks": [
    { "Plugin": "Heal", "Scale": 0, "Alpha1": 0.8 },
    { "Plugin": "Skin Tone", "Scale": 0, "Alpha1": 1.0, "Alpha2": 1.0 }
  ]
}
\`\`\`

See the **Plugin Reference** section in this help page for the available plugin names. Scale, Alpha1, and Alpha2 are intensity parameters; values typically range from 0 to 1.

**Before/after images**

Each preset has a Before image and an After image used to demonstrate the look. Each field has an **Upload** button — click it, pick a file from your computer, and the image is pushed to the public \`backgrounds\` bucket and the URL auto-fills. You can also paste a URL directly into the small text field below the Upload button if you already host the image elsewhere. The thumbnail next to each field is a live preview of what the user will see.

Recommended sizes:
- **Before image** — square or matching the After image's aspect ratio (used only in the preview slider when a user expands a card)
- **After image** — square (also used as the preset card thumbnail in One Click Enhance and Featured Presets)
- Keep each file under ~2 MB; Vercel rejects multipart uploads larger than ~4.5 MB.

**Thumbnails on preset cards**

The **After image URL** is also used as the thumbnail on preset cards in One Click Enhance and on the Dashboard's Featured Presets. If you do not set an After URL, the preset card falls back to the emoji icon. Use a clean square or landscape sample of the finished look — square works best for One Click Enhance grid cards.

**Hiding presets**

Use the eye icon on each row to toggle a preset between active and hidden. Hidden presets are not shown to users but are preserved in the database for later re-activation.

**Empty state**

If no presets exist in the database, the One Click Enhance panel shows an empty-state message and the Dashboard's Featured Presets section is hidden. There is no built-in fallback library — every preset must be created here.

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
  {
    id: 'uploads-persist',
    title: 'Uploads Survive Refresh',
    content: `
**What it does**

Your uploaded images stay loaded if you refresh the page or close the tab and come back. There is nothing to set up — uploads are saved automatically to your browser as soon as you pick a file.

**How it works**
- Files are stored locally in your browser (IndexedDB), not on Smalltouch servers
- Each account on a given browser keeps its own uploads — switching accounts on the same device does not mix them
- Signing out clears your saved uploads from the browser
- Other devices and other browsers will not see your uploads — they are local to this browser only

**Token costs**

None. Persisting uploads to your browser is free and does not cost tokens or storage quota.

**Expected behavior**
- Refresh the Retouch or Background page → your most recent uploads reload automatically
- On the Background page, if you had already uploaded to cloud storage (the **Uploaded** step), that link is restored too so you can continue from where you left off
- Layer adjustments, presets, AI-generated backgrounds, and partially completed jobs are **not** restored — only the source files are

**Common issues**
- *Uploads do not reappear* — make sure cookies/site data are not blocked for this domain; private/incognito tabs may clear IndexedDB on close
- *Wrong files appear* — sign out and back in to clear stale data
- *Storage full* — modern browsers grant ~50% of free disk to a site; if you hit the limit, clear browser data for this site or remove a few large uploads
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
