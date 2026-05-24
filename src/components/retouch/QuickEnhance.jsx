import { useState, useEffect } from 'react'
import { CATEGORIES } from '../../registry/presets'
import { supabase } from '../../lib/supabase'
import TokenCostBadge from '../shared/TokenCostBadge'

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

export default function QuickEnhance({ selectedPreset, onPresetSelect }) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [dbPresets, setDbPresets] = useState([])
  const [presetsLoaded, setPresetsLoaded] = useState(false)

  useEffect(() => {
    supabase
      .from('system_presets')
      .select('*')
      .eq('status', 'active')
      .order('sort_order')
      .then(({ data }) => {
        setDbPresets(data?.map(dbToPreset) ?? [])
        setPresetsLoaded(true)
      })
  }, [])

  const visiblePresets =
    activeCategory === 'All'
      ? dbPresets
      : dbPresets.filter(p => p.categories.includes(activeCategory))

  function handleCardClick(preset) {
    // Toggle off if already selected, otherwise select
    onPresetSelect(selectedPreset?.id === preset.id ? null : preset)
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-[#f5f5f5] text-base">Presets</h2>

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

      {presetsLoaded && visiblePresets.length === 0 ? (
        <p className="text-[#a3a3a3] text-xs text-center py-8">
          No presets available yet.{' '}
          {activeCategory !== 'All'
            ? 'Try a different category, or an admin can '
            : 'An admin can '}
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
    </div>
  )
}
