import { useState, useEffect } from 'react'
import { Loader2, Play, Wand2, X, Sparkles, ShieldCheck } from 'lucide-react'
import TokenCostBadge from '../shared/TokenCostBadge'

const MODEL_OPTIONS = [
  {
    id: 'nano_banana',
    label: 'Creative',
    icon: Sparkles,
    description: 'Nano Banana · may alter subject',
  },
  {
    id: 'gpt_image_2',
    label: 'Precise',
    icon: ShieldCheck,
    description: 'GPT-Image 2 · preserves subject',
  },
]

function statusDotClass(status) {
  if (status === 'processing') return 'bg-[#f59e0b]'
  if (status === 'completed') return 'bg-[#22c55e]'
  if (status === 'failed') return 'bg-[#ef4444]'
  return 'bg-[#3a352b]'
}

export default function BgApplyPanel({
  selectedImage,
  selectedPreset,
  processing,
  balance,
  onApply,
  batchQueue = [],
  batchStatuses = {},
  batchRunning = false,
  onRemoveFromBatch,
  onStartBatch,
  selectedModel = 'nano_banana',
  onModelChange,
}) {
  const [focusedItemId, setFocusedItemId] = useState(null)

  const hasBatch = batchQueue.length > 0

  useEffect(() => {
    if (focusedItemId && !batchQueue.find(i => i.id === focusedItemId)) {
      setFocusedItemId(null)
    }
  }, [batchQueue, focusedItemId])

  const focusedItem = batchQueue.find(i => i.id === focusedItemId) ?? (hasBatch ? batchQueue[0] : null)
  const previewImage = focusedItem ?? selectedImage

  const canAfford = selectedPreset ? balance >= selectedPreset.tokenCost : false
  const canRun = !!(selectedImage && selectedPreset && !processing && canAfford && !batchRunning)
  const totalCost = selectedPreset ? batchQueue.length * selectedPreset.tokenCost : 0

  return (
    <div className="rounded-xl overflow-hidden border border-[#2b271f]">

      {/* Large preview with action bar overlay */}
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

        {selectedPreset && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 px-2.5 py-2 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0">{selectedPreset.icon}</span>
              <span className="text-[#f2ede2] text-xs font-medium truncate">{selectedPreset.name}</span>
              <TokenCostBadge cost={selectedPreset.tokenCost} />
            </div>
            <button
              onClick={() => onApply(selectedPreset)}
              disabled={!canRun}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c5a572] hover:bg-[#9b7d4c] disabled:opacity-40 disabled:cursor-not-allowed text-[#0a0908] text-xs font-medium transition-colors"
            >
              {processing ? (
                <><Loader2 size={11} className="animate-spin" /> Replacing…</>
              ) : (
                <><Wand2 size={11} />
                  {!selectedImage ? 'No image' : !canAfford ? 'Need tokens' : 'Replace BG'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Model selector */}
      <div className="border-t border-[#2b271f] bg-[#121110] px-3 py-2.5">
        <p className="text-[#6b665c] text-[10px] uppercase tracking-wider mb-2">Generation mode</p>
        <div className="flex gap-2">
          {MODEL_OPTIONS.map(({ id, label, icon: Icon, description }) => {
            const active = selectedModel === id
            return (
              <button
                key={id}
                onClick={() => onModelChange?.(id)}
                disabled={processing || batchRunning}
                className={`flex-1 flex flex-col gap-1 px-2.5 py-2 rounded-lg border text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  active
                    ? 'border-[#c5a572] bg-[#c5a572]/10'
                    : 'border-[#2b271f] hover:border-[#3a352b] hover:bg-[#16140f]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon size={11} className={active ? 'text-[#c5a572]' : 'text-[#6b665c]'} />
                  <span className={`text-xs font-medium ${active ? 'text-[#f2ede2]' : 'text-[#9a9387]'}`}>{label}</span>
                </div>
                <span className="text-[10px] text-[#6b665c] leading-tight">{description}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Batch filmstrip */}
      {hasBatch && (
        <div className="h-[76px] border-t border-[#2b271f] bg-[#121110] flex items-center gap-2 px-3">
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

      {!selectedPreset && !hasBatch && (
        <div className="px-3 py-2.5 bg-[#121110] border-t border-[#2b271f]">
          <p className="text-[#6b665c] text-xs text-center">Select a preset above to continue</p>
        </div>
      )}

      {balance < (selectedPreset?.tokenCost ?? 2) && balance >= 0 && selectedPreset && (
        <div className="px-3 py-2 bg-[#121110] border-t border-[#2b271f]">
          <p className="text-[#f59e0b] text-[10px] text-center">
            Not enough tokens — redeem a voucher on the Tokens page
          </p>
        </div>
      )}
    </div>
  )
}
