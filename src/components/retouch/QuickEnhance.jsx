import { useState, useEffect } from 'react'
import { Play, X } from 'lucide-react'
import { CATEGORIES } from '../../registry/presets'
import { supabase } from '../../lib/supabase'
import TokenCostBadge from '../shared/TokenCostBadge'
import BeforeAfterSlider from '../shared/BeforeAfterSlider'

function dbToPreset(row) {
  return {
    id: row.id,
    panel: row.panel,
    name: row.name,
    icon: row.icon,
    description: row.description,
    categories: row.categories ?? [],
    tokenCost: row.token_cost,
    payload: row.payload,
    beforeImageUrl: row.before_image_url,
    afterImageUrl: row.after_image_url,
  }
}

export default function QuickEnhance({ selectedImage, onEnhance, disabled, balance, selectedPreset, onPresetSelect }) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [previewPreset, setPreviewPreset] = useState(null)
  const [dbPresets, setDbPresets] = useState([])
  const [presetsLoaded, setPresetsLoaded] = useState(false)

  useEffect(() => {
    supabase.from('system_presets').select('*').eq('status', 'active').order('sort_order').then(({ data }) => {
      setDbPresets(data?.map(dbToPreset) ?? [])
      setPresetsLoaded(true)
    })
  }, [])

  const visiblePresets = activeCategory === 'All'
    ? dbPresets
    : dbPresets.filter(p => p.categories.includes(activeCategory))

  function handleCardClick(preset) {
    if (previewPreset?.id === preset.id) {
      setPreviewPreset(null)
    } else {
      setPreviewPreset(preset)
    }
  }

  function handleSelect(preset) {
    onPresetSelect(preset)
    setPreviewPreset(null)
  }

  function handleEnhance() {
    if (!selectedImage || !selectedPreset) return
    onEnhance(selectedPreset)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-display font-semibold text-[#f5f5f5] text-base">One Click Enhance</h2>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-[#a855f7] text-white'
                : 'bg-[#242424] text-[#a3a3a3] hover:text-[#f5f5f5]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {previewPreset && (
        <div className="bg-[#242424] rounded-xl p-3 border border-[#a855f7]/40 space-y-3">
          <BeforeAfterSlider
            beforeSrc={previewPreset.beforeImageUrl || selectedImage?.preview}
            afterSrc={previewPreset.afterImageUrl || null}
            className="w-full h-44"
          />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#f5f5f5] text-sm font-medium">{previewPreset.name}</p>
              <p className="text-[#a3a3a3] text-xs">{previewPreset.description}</p>
              <div className="flex gap-1 mt-1">
                {previewPreset.categories.map(c => (
                  <span key={c} className="text-[10px] text-[#a3a3a3] bg-[#1a1a1a] px-1.5 py-0.5 rounded">{c}</span>
                ))}
              </div>
            </div>
            <TokenCostBadge cost={previewPreset.tokenCost} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSelect(previewPreset)}
              className="flex-1 py-2 rounded-lg bg-[#a855f7] hover:bg-[#7c3aed] text-white text-sm font-medium transition-colors"
            >
              Select This Preset
            </button>
            <button onClick={() => setPreviewPreset(null)} className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#2a2a2a] text-[#a3a3a3] transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {presetsLoaded && visiblePresets.length === 0 ? (
        <p className="text-[#a3a3a3] text-xs text-center py-8">
          No presets available yet. {activeCategory !== 'All' ? `Try a different category, or an admin can ` : 'An admin can '}
          add presets from the Admin → Presets editor.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {visiblePresets.map(preset => (
            <button
              key={preset.id}
              onClick={() => handleCardClick(preset)}
              className={`group relative bg-[#242424] hover:bg-[#2a2a2a] rounded-xl overflow-hidden border transition-all ${
                selectedPreset?.id === preset.id
                  ? 'border-[#a855f7] ring-1 ring-[#a855f7]/40'
                  : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
              }`}
            >
              <div className="aspect-square bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
                {preset.afterImageUrl ? (
                  <img
                    src={preset.afterImageUrl}
                    alt={preset.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-2xl">{preset.icon}</span>
                )}
              </div>
              <div className="p-2 text-left">
                <p className="text-[#f5f5f5] text-xs font-medium leading-tight">{preset.name}</p>
                <TokenCostBadge cost={preset.tokenCost} className="mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedPreset && (
        <div className="flex items-center justify-between bg-[#242424] rounded-xl p-3">
          <div>
            <p className="text-[#f5f5f5] text-sm font-medium">Selected: {selectedPreset.name}</p>
            <p className="text-[#a3a3a3] text-xs">
              {balance < selectedPreset.tokenCost
                ? `Need ${selectedPreset.tokenCost} tokens — you have ${balance}`
                : `Cost: ${selectedPreset.tokenCost} token`}
            </p>
          </div>
          <button
            onClick={handleEnhance}
            disabled={disabled || !selectedImage || balance < selectedPreset.tokenCost}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#a855f7] hover:bg-[#7c3aed] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            <Play size={14} />
            Enhance Now
          </button>
        </div>
      )}

      {!selectedImage && (
        <p className="text-[#a3a3a3] text-xs text-center">Upload an image to get started</p>
      )}
    </div>
  )
}
