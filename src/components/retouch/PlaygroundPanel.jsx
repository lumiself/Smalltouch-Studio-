import { useState, useEffect } from 'react'
import { X, Play, Zap } from 'lucide-react'
import TokenCostBadge from '../shared/TokenCostBadge'

function statusDotClass(status) {
  if (status === 'processing') return 'bg-[#f59e0b]'
  if (status === 'completed') return 'bg-[#22c55e]'
  if (status === 'failed') return 'bg-[#ef4444]'
  return 'bg-[#3a352b]'
}

export default function PlaygroundPanel({
  selectedImage,
  selectedPreset,
  batchQueue,
  batchStatuses = {},
  batchRunning,
  balance,
  onRemoveFromBatch,
  onStartBatch,
  onEnhance,
}) {
  const [focusedItemId, setFocusedItemId] = useState(null)

  const hasBatch = batchQueue.length > 0

  // Keep focusedItemId valid as items are removed
  useEffect(() => {
    if (focusedItemId && !batchQueue.find(i => i.id === focusedItemId)) {
      setFocusedItemId(null)
    }
  }, [batchQueue, focusedItemId])

  // Preview shows the focused filmstrip item, falling back to library selection
  const focusedItem = batchQueue.find(i => i.id === focusedItemId) ?? (hasBatch ? batchQueue[0] : null)
  const previewImage = focusedItem ?? selectedImage

  const totalCost = selectedPreset ? batchQueue.length * selectedPreset.tokenCost : 0
  const canAfford = selectedPreset ? balance >= selectedPreset.tokenCost : false
  const canEnhance = !!(selectedImage && selectedPreset && canAfford && !batchRunning)

  return (
    <div className="rounded-xl overflow-hidden border border-[#2b271f]">

      {/* Large preview — shows focused filmstrip item, falls back to library selection */}
      <div className="h-52 bg-[#0a0908] relative overflow-hidden">
        {previewImage ? (
          <img
            src={previewImage.preview}
            alt="Preview"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#2b271f] text-xs">Select an image to preview</p>
          </div>
        )}

        {/* Preset action bar — overlaid at the bottom of the preview */}
        {selectedPreset && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 px-2.5 py-2 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[#f2ede2] text-xs font-medium truncate">{selectedPreset.name}</span>
              <TokenCostBadge cost={selectedPreset.tokenCost} />
            </div>
            <button
              onClick={() => onEnhance(selectedPreset)}
              disabled={!canEnhance}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c5a572] hover:bg-[#9b7d4c] disabled:opacity-40 disabled:cursor-not-allowed text-[#0a0908] text-xs font-medium transition-colors"
            >
              <Zap size={11} />
              {!selectedImage
                ? 'No image'
                : !canAfford
                ? 'Need tokens'
                : 'Enhance Now'}
            </button>
          </div>
        )}
      </div>

      {/* Batch filmstrip */}
      {hasBatch && (
        <div className="h-[76px] border-t border-[#2b271f] bg-[#121110] flex items-center gap-2 px-3">
          {/* Thumbnails */}
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto min-w-0 pr-1">
            {batchQueue.map(item => (
              <div
                key={item.id}
                onClick={() => setFocusedItemId(item.id)}
                className={`relative shrink-0 w-12 h-12 rounded overflow-hidden group/thumb cursor-pointer ring-2 transition-all ${
                  focusedItem?.id === item.id ? 'ring-[#c5a572]' : 'ring-transparent'
                }`}
              >
                <img src={item.preview} alt={item.name} className="w-full h-full object-cover" />
                <span
                  className={`absolute bottom-0.5 left-0.5 w-2 h-2 rounded-full ${statusDotClass(batchStatuses[item.id])}`}
                />
                {!batchRunning && (
                  <button
                    onClick={e => { e.stopPropagation(); onRemoveFromBatch(item.id) }}
                    className="absolute top-0 right-0 w-4 h-4 bg-black/70 rounded-bl flex items-center justify-center opacity-100 md:opacity-0 md:group-hover/thumb:opacity-100 transition-opacity"
                  >
                    <X size={8} className="text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Batch run control */}
          <div className="shrink-0 flex flex-col items-end gap-1">
            {selectedPreset ? (
              <>
                <p className="text-[10px] text-[#9a9387] whitespace-nowrap">
                  {batchQueue.length} image{batchQueue.length !== 1 ? 's' : ''}
                  {' · '}
                  <span className="text-[#c5a572]">{totalCost}t</span>
                </p>
                <button
                  onClick={onStartBatch}
                  disabled={batchRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c5a572] hover:bg-[#9b7d4c] disabled:opacity-40 text-[#0a0908] text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <Play size={10} />
                  {batchRunning ? 'Running…' : `Batch (${batchQueue.length})`}
                </button>
              </>
            ) : (
              <p className="text-[10px] text-[#9a9387] text-right whitespace-nowrap leading-snug">
                Select a preset<br />to run batch
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
