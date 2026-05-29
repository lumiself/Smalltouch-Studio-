import { useState, useEffect, useRef } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { BACKGROUND_CATEGORIES } from '../../registry/presets'
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

export default function BgPresets({ selectedPreset, onPresetSelect }) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [previewPreset, setPreviewPreset] = useState(null)
  const modalRef = useRef(null)
  const [dbPresets, setDbPresets] = useState([])
  const [presetsLoaded, setPresetsLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)

  async function loadPresets() {
    setLoadError(null)
    setPresetsLoaded(false)
    const { data, error } = await supabase
      .from('system_presets')
      .select('*')
      .eq('panel', 'background')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .limit(500)
    if (error) {
      setLoadError(error.message)
      setPresetsLoaded(true)
      return
    }
    setDbPresets(data?.map(dbToPreset) ?? [])
    setPresetsLoaded(true)
  }

  useEffect(() => { loadPresets() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const visiblePresets =
    activeCategory === 'All'
      ? dbPresets
      : dbPresets.filter(p => p.categories.includes(activeCategory))

  useEffect(() => {
    if (previewPreset && modalRef.current) {
      modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [previewPreset])

  function handleCardClick(preset) {
    setPreviewPreset(prev => prev?.id === preset.id ? null : preset)
  }

  function handleSelect(preset) {
    onPresetSelect(selectedPreset?.id === preset.id ? null : preset)
    setPreviewPreset(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif font-semibold text-[#f2ede2] text-base">Background Presets</h2>
        <p className="text-[#6b665c] text-xs mt-0.5">Select a scene to transform the background with AI</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {BACKGROUND_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-[#c5a572] text-[#0a0908]'
                : 'bg-[#16140f] text-[#9a9387] hover:text-[#f2ede2]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {previewPreset && (
        <div ref={modalRef} className="bg-[#16140f] rounded-xl p-3 border border-[#c5a572]/40 space-y-3">
          {previewPreset.beforeImageUrl || previewPreset.afterImageUrl ? (
            <BeforeAfterSlider
              beforeSrc={previewPreset.beforeImageUrl}
              afterSrc={previewPreset.afterImageUrl}
              className="w-full aspect-square"
            />
          ) : (
            <div className="w-full aspect-square bg-[#121110] rounded-lg flex items-center justify-center">
              <span className="text-4xl">{previewPreset.icon}</span>
            </div>
          )}
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[#f2ede2] text-sm font-medium">{previewPreset.name}</p>
              <p className="text-[#9a9387] text-xs">{previewPreset.description}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {previewPreset.categories.map(c => (
                  <span key={c} className="text-[10px] text-[#9a9387] bg-[#121110] px-1.5 py-0.5 rounded">{c}</span>
                ))}
              </div>
            </div>
            <TokenCostBadge cost={previewPreset.tokenCost} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSelect(previewPreset)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPreset?.id === previewPreset.id
                  ? 'bg-[#9b7d4c] text-white'
                  : 'bg-[#c5a572] hover:bg-[#9b7d4c] text-[#0a0908]'
              }`}
            >
              {selectedPreset?.id === previewPreset.id ? 'Deselect' : 'Select Preset'}
            </button>
            <button
              onClick={() => setPreviewPreset(null)}
              className="p-2 rounded-lg bg-[#121110] hover:bg-[#2b271f] text-[#9a9387] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {loadError && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#121110] border border-[#ef4444]/30 rounded-lg">
          <p className="text-[#ef4444] text-xs">Failed to load presets: {loadError}</p>
          <button onClick={loadPresets} className="shrink-0 text-[#9a9387] hover:text-[#f2ede2]">
            <RefreshCw size={13} />
          </button>
        </div>
      )}

      {presetsLoaded && !loadError && visiblePresets.length === 0 ? (
        <p className="text-[#9a9387] text-xs text-center py-8">
          No background presets yet.{' '}
          {activeCategory !== 'All'
            ? 'Try a different category, or an admin can '
            : 'An admin can '}
          add presets from Admin → Presets editor.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {visiblePresets.map(preset => (
            <button
              key={preset.id}
              onClick={() => handleCardClick(preset)}
              className={`group relative bg-[#16140f] hover:bg-[#2b271f] rounded-xl overflow-hidden border transition-all ${
                selectedPreset?.id === preset.id
                  ? 'border-[#c5a572] ring-1 ring-[#c5a572]/40'
                  : 'border-[#2b271f] hover:border-[#3a352b]'
              }`}
            >
              <div className="aspect-square bg-[#121110] flex items-center justify-center overflow-hidden">
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
                <p className="text-[#f2ede2] text-xs font-medium leading-tight">{preset.name}</p>
                <TokenCostBadge cost={preset.tokenCost} className="mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
