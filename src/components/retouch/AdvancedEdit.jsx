import { useState } from 'react'
import { Play, Download, Lock, CheckCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { canUseAction, getRequiredPackageForAction } from '../../lib/access'

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
  { id: 'subtle', label: 'Subtle' },
  { id: 'normal', label: 'Normal' },
  { id: 'extreme', label: 'Extreme' },
]

export default function AdvancedEdit({ selectedImage, onStartEditing, processing, jobComplete, onDownloadZip, balance, disabled }) {
  const { profile } = useAuth()
  const [enabledPlugins, setEnabledPlugins] = useState(['Heal', 'Dodge Burn', 'Skin Tone'])
  const [intensity, setIntensity] = useState('normal')

  const tokenCost = 2
  const isLocked = !canUseAction(profile, 'advanced_edit')
  const requiredPkg = getRequiredPackageForAction('advanced_edit')

  function togglePlugin(id) {
    setEnabledPlugins(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  function handleStart() {
    if (!selectedImage || enabledPlugins.length === 0) return
    onStartEditing({ plugins: enabledPlugins, intensityMode: intensity })
  }

  if (isLocked) {
    return (
      <div className="space-y-4">
        <h2 className="font-serif font-semibold text-[#f2ede2] text-base">Advanced Edit</h2>
        <div className="bg-[#121110] border border-[#2b271f] rounded-xl p-6 flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-full bg-[#16140f] flex items-center justify-center">
            <Lock size={18} className="text-[#9a9387]" />
          </div>
          <div>
            <p className="text-[#f2ede2] text-sm font-medium">Advanced Edit is locked</p>
            <p className="text-[#9a9387] text-xs mt-1">
              Requires {requiredPkg ? `${requiredPkg.icon} ${requiredPkg.name}` : 'a higher package'}
            </p>
          </div>
          <a href="/tokens" className="text-xs text-[#c5a572] hover:text-[#9b7d4c] transition-colors">
            View packages →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="font-serif font-semibold text-[#f2ede2] text-base">Advanced Edit</h2>

      {selectedImage ? (
        <div className="aspect-[4/3] bg-[#16140f] rounded-lg overflow-hidden relative">
          <img src={selectedImage.preview} alt="Original" className="w-full h-full object-cover" />
          {processing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#c5a572] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {jobComplete && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <CheckCircle size={32} className="text-[#22c55e]" />
            </div>
          )}
        </div>
      ) : (
        <div className="h-28 bg-[#16140f] rounded-lg flex items-center justify-center text-[#9a9387] text-sm">
          Select an image to edit
        </div>
      )}

      {jobComplete ? (
        <div className="space-y-3">
          <p className="text-[#9a9387] text-xs leading-relaxed">
            Layers ZIP is ready. Open it in Photoshop — each plugin is a separate layer with its blend mode already set.
          </p>
          <button
            onClick={onDownloadZip}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-[#c5a572] hover:bg-[#9b7d4c] text-[#0a0908] text-sm font-medium transition-colors"
          >
            <Download size={14} />
            Download Layers ZIP
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {AVAILABLE_PLUGINS.map(plugin => (
              <label key={plugin.id} className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={enabledPlugins.includes(plugin.id)}
                  onChange={() => togglePlugin(plugin.id)}
                  disabled={processing}
                  className="w-3.5 h-3.5 accent-[#c5a572]"
                />
                <span className="text-[#f2ede2] text-xs">{plugin.label}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-[#9a9387] text-xs font-medium">Intensity</p>
            <div className="flex gap-2">
              {INTENSITY_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setIntensity(mode.id)}
                  disabled={processing}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors border ${
                    intensity === mode.id
                      ? 'bg-[#c5a572]/20 border-[#c5a572] text-[#c5a572]'
                      : 'bg-[#16140f] border-[#2b271f] text-[#9a9387] hover:border-[#3a352b]'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[#9a9387] text-xs">Cost: {tokenCost} tokens</p>
            <button
              onClick={handleStart}
              disabled={disabled || !selectedImage || enabledPlugins.length === 0 || processing || balance < tokenCost}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#c5a572] hover:bg-[#9b7d4c] disabled:opacity-40 disabled:cursor-not-allowed text-[#0a0908] text-sm font-medium transition-colors"
            >
              <Play size={14} />
              {processing ? 'Processing...' : 'Start Editing'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
