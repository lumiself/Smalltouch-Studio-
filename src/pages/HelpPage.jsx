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
