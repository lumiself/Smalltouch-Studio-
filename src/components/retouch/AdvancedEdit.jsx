import { useState, useEffect, useRef } from 'react'
import { Play, Save, Lock } from 'lucide-react'
import LayerControls from './LayerControls'
import { useAuth } from '../../hooks/useAuth'
import { canUseAction, getRequiredPackageForAction } from '../../lib/access'

// Canvas supports these blend modes natively (matches CSS Compositing spec)
const CANVAS_BLEND_MAP = {
  'normal':     'source-over',
  'multiply':   'multiply',
  'screen':     'screen',
  'overlay':    'overlay',
  'soft-light': 'soft-light',
  'hard-light': 'hard-light',
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// linear-light = 2*Cs + Cb - 1, clamped to [0,1]
// Canvas has no native equivalent so we compute it per-pixel.
function blendLinearLight(ctx, img, w, h, opacity) {
  const tmp = document.createElement('canvas')
  tmp.width = w
  tmp.height = h
  tmp.getContext('2d').drawImage(img, 0, 0, w, h)
  const base = ctx.getImageData(0, 0, w, h)
  const layer = tmp.getContext('2d').getImageData(0, 0, w, h)
  for (let i = 0; i < base.data.length; i += 4) {
    const la = (layer.data[i + 3] / 255) * opacity
    if (la === 0) continue
    for (let c = 0; c < 3; c++) {
      const cb = base.data[i + c] / 255
      const cs = layer.data[i + c] / 255
      const ll = Math.min(1, Math.max(0, 2 * cs + cb - 1))
      base.data[i + c] = Math.round((ll * la + cb * (1 - la)) * 255)
    }
  }
  ctx.putImageData(base, 0, 0)
}

// Applies a layer using Photoshop-accurate opacity:
//   result = base * (1 - opacity) + Blend(base, layer) * opacity
// Canvas globalAlpha applies alpha BEFORE blending (pre-multiplied), which
// differs from Photoshop opacity that applies AFTER. The two-canvas approach
// below matches Photoshop behavior for all blend modes at any opacity.
function blendLayer(ctx, img, w, h, blendMode, opacity) {
  if (opacity <= 0) return

  if (blendMode === 'linear-light') {
    blendLinearLight(ctx, img, w, h, opacity)
    return
  }

  const canvasMode = CANVAS_BLEND_MAP[blendMode] || 'source-over'

  // Step 1: produce the fully-blended result on a temp canvas
  const blend = document.createElement('canvas')
  blend.width = w
  blend.height = h
  const bCtx = blend.getContext('2d')
  bCtx.drawImage(ctx.canvas, 0, 0)          // copy current base
  bCtx.globalCompositeOperation = canvasMode
  bCtx.drawImage(img, 0, 0, w, h)           // blend layer at full strength

  // Step 2: composite the blended result over the base at the desired opacity
  // source-over at opacity X gives: base*(1-X) + blended*X  ✓
  ctx.globalAlpha = opacity
  ctx.drawImage(blend, 0, 0)
  ctx.globalAlpha = 1
}

async function compositeLayersToCanvas(canvas, baseUrl, layers) {
  const base = await loadImage(baseUrl)
  canvas.width = base.naturalWidth
  canvas.height = base.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(base, 0, 0)

  for (const layer of layers) {
    if (layer.opacity <= 0) continue
    const img = await loadImage(layer.url)
    blendLayer(ctx, img, canvas.width, canvas.height, layer.blendMode, layer.opacity)
  }
}

const AVAILABLE_PLUGINS = [
  { id: 'Heal', label: 'Heal', description: 'Blemish cleanup' },
  { id: 'Dodge Burn', label: 'Dodge Burn', description: 'Light and shadow shaping' },
  { id: 'Portrait Volumes', label: 'Portrait Volumes', description: 'Face volume & contours' },
  { id: 'Skin Tone', label: 'Skin Tone', description: 'Unify skin color' },
  { id: 'Eye Vessels', label: 'Eye Vessels', description: 'Reduce eye redness' },
  { id: 'Eye Brilliance', label: 'Eye Brilliance', description: 'Enhance iris brightness' },
  { id: 'White Teeth', label: 'White Teeth', description: 'Whiten teeth' },
  { id: 'Mattifier', label: 'Mattifier', description: 'Reduce skin shine' },
  { id: 'Glasses Anti Glare', label: 'Glasses Anti Glare', description: 'Remove glasses glare' },
  { id: 'Clean Backdrop', label: 'Clean Backdrop', description: 'Clean background' },
  { id: 'Dust', label: 'Dust', description: 'Remove fine dust' },
  { id: 'Fabric', label: 'Fabric', description: 'Soften fabric wrinkles' },
]

const INTENSITY_MODES = [
  { id: 'subtle', label: 'Subtle', description: 'Light touch' },
  { id: 'normal', label: 'Normal', description: 'Balanced' },
  { id: 'extreme', label: 'Extreme', description: 'Strong' },
]

export default function AdvancedEdit({ selectedImage, onStartEditing, processing, layers, onLayerOpacityChange, onSavePreset, onDownload, balance, disabled }) {
  const { profile } = useAuth()
  const [enabledPlugins, setEnabledPlugins] = useState(['Heal', 'Dodge Burn', 'Skin Tone'])
  const [intensity, setIntensity] = useState('normal')
  const [savingPreset, setSavingPreset] = useState(false)
  const [presetName, setPresetName] = useState('')
  const canvasRef = useRef(null)
  const compositeIdRef = useRef(0)

  const haslayers = layers && layers.length > 0

  useEffect(() => {
    if (!haslayers || !selectedImage || !canvasRef.current) return
    const id = ++compositeIdRef.current
    compositeLayersToCanvas(canvasRef.current, selectedImage.preview, layers)
      .catch(err => { if (compositeIdRef.current === id) console.error('Composite error:', err) })
  }, [layers, selectedImage, haslayers])

  const tokenCost = 2
  const isLocked = !canUseAction(profile, 'advanced_edit')
  const requiredPkg = getRequiredPackageForAction('advanced_edit')

  function togglePlugin(pluginId) {
    if (haslayers) return
    setEnabledPlugins(prev =>
      prev.includes(pluginId) ? prev.filter(p => p !== pluginId) : [...prev, pluginId]
    )
  }

  function handleIntensityChange(mode) {
    if (haslayers) return
    setIntensity(mode)
  }

  function handleStart() {
    if (!selectedImage || enabledPlugins.length === 0) return
    onStartEditing({ plugins: enabledPlugins, intensityMode: intensity })
  }

  function handleSavePreset(e) {
    e.preventDefault()
    if (!presetName.trim()) return
    onSavePreset({ name: presetName.trim(), plugins: enabledPlugins, layers, intensity })
    setSavingPreset(false)
    setPresetName('')
  }

  if (isLocked) {
    return (
      <div className="space-y-4">
        <h2 className="font-display font-semibold text-[#f5f5f5] text-base">Advanced Edit</h2>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-full bg-[#242424] flex items-center justify-center">
            <Lock size={18} className="text-[#a3a3a3]" />
          </div>
          <div>
            <p className="text-[#f5f5f5] text-sm font-medium">Advanced Edit is locked</p>
            <p className="text-[#a3a3a3] text-xs mt-1">
              Requires {requiredPkg ? `${requiredPkg.icon} ${requiredPkg.name}` : 'a higher package'}
            </p>
          </div>
          <a href="/tokens" className="text-xs text-[#a855f7] hover:text-[#7c3aed] transition-colors">
            View packages →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-[#f5f5f5] text-base">Advanced Edit</h2>

      {selectedImage ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-[#a3a3a3] text-xs">Original</p>
            <div className="aspect-[4/3] bg-[#242424] rounded-lg overflow-hidden">
              <img src={selectedImage.preview} alt="Original" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[#a3a3a3] text-xs">Edited</p>
            <div className="aspect-[4/3] bg-[#242424] rounded-lg overflow-hidden relative flex items-center justify-center">
              {haslayers ? (
                <canvas ref={canvasRef} className="w-full h-full" style={{ objectFit: 'cover', display: 'block' }} />
              ) : (
                <p className="text-[#555] text-xs text-center px-4">
                  {processing ? '' : 'Run advanced edit to see result'}
                </p>
              )}
              {processing && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-28 bg-[#242424] rounded-lg flex items-center justify-center text-[#a3a3a3] text-sm">
          Select an image to edit
        </div>
      )}

      {!haslayers && (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {AVAILABLE_PLUGINS.map(plugin => (
              <label key={plugin.id} className={`flex items-center gap-2 cursor-pointer py-1 ${haslayers ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  checked={enabledPlugins.includes(plugin.id)}
                  onChange={() => togglePlugin(plugin.id)}
                  disabled={haslayers}
                  className="w-3.5 h-3.5 accent-purple-500"
                />
                <span className="text-[#f5f5f5] text-xs">{plugin.label}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-[#a3a3a3] text-xs font-medium">Intensity</p>
            <div className="flex gap-2">
              {INTENSITY_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => handleIntensityChange(mode.id)}
                  disabled={haslayers}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors border ${
                    intensity === mode.id
                      ? 'bg-[#a855f7]/20 border-[#a855f7] text-[#a855f7]'
                      : 'bg-[#242424] border-[#2a2a2a] text-[#a3a3a3] hover:border-[#3a3a3a]'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[#a3a3a3] text-xs">Cost: {tokenCost} tokens</p>
            <button
              onClick={handleStart}
              disabled={disabled || !selectedImage || enabledPlugins.length === 0 || processing || balance < tokenCost}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#a855f7] hover:bg-[#7c3aed] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              <Play size={14} />
              {processing ? 'Processing...' : 'Start Editing'}
            </button>
          </div>
        </>
      )}

      {haslayers && (
        <>
          <LayerControls layers={layers} onOpacityChange={onLayerOpacityChange} />
          <div className="flex gap-2">
            {!savingPreset ? (
              <button
                onClick={() => setSavingPreset(true)}
                className="flex items-center gap-2 flex-1 py-2 px-3 rounded-lg bg-[#242424] hover:bg-[#2a2a2a] text-[#f5f5f5] text-sm font-medium transition-colors border border-[#2a2a2a]"
              >
                <Save size={14} />
                Save as Preset
              </button>
            ) : (
              <form onSubmit={handleSavePreset} className="flex gap-2 flex-1">
                <input
                  type="text"
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  placeholder="Preset name..."
                  autoFocus
                  className="flex-1 px-3 py-2 bg-[#242424] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-sm placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#a855f7]"
                />
                <button type="submit" className="px-3 py-2 rounded-lg bg-[#a855f7] text-white text-sm font-medium hover:bg-[#7c3aed] transition-colors">
                  Save
                </button>
              </form>
            )}
            <button
              onClick={onDownload}
              className="py-2 px-3 rounded-lg bg-[#242424] hover:bg-[#2a2a2a] text-[#f5f5f5] text-sm border border-[#2a2a2a] transition-colors"
            >
              Download
            </button>
          </div>
        </>
      )}
    </div>
  )
}
