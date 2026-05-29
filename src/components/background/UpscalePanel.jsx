import { useState, useEffect } from 'react'
import { Loader2, Play, Maximize2, X } from 'lucide-react'
import TokenCostBadge from '../shared/TokenCostBadge'

const TOKEN_COST = 1

function statusDotClass(status) {
  if (status === 'processing') return 'bg-[#f59e0b]'
  if (status === 'completed') return 'bg-[#22c55e]'
  if (status === 'failed') return 'bg-[#ef4444]'
  return 'bg-[#3a352b]'
}

function NumberInput({ value, onChange, min, max, step = 1, suffix }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => {
          const v = Number(e.target.value)
          if (!isNaN(v)) onChange(Math.min(Math.max(v, min), max))
        }}
        className="w-16 bg-[#0a0908] border border-[#2b271f] rounded-lg px-2 py-1 text-xs text-[#f2ede2] text-center focus:outline-none focus:border-[#c5a572]"
      />
      {suffix && <span className="text-[#6b665c] text-xs">{suffix}</span>}
    </div>
  )
}

export default function UpscalePanel({
  selectedImage,
  processing,
  balance,
  onUpscale,
  batchQueue = [],
  batchStatuses = {},
  batchRunning = false,
  onRemoveFromBatch,
  onStartBatch,
  // settings
  upscaleMode,
  onUpscaleModeChange,
  targetMp,
  onTargetMpChange,
  factor,
  onFactorChange,
  enhanceDetails,
  onEnhanceDetailsChange,
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

  const canAfford = balance >= TOKEN_COST
  const canRun = !!(selectedImage && !processing && canAfford && !batchRunning)
  const totalCost = batchQueue.length * TOKEN_COST

  return (
    <div className="rounded-xl overflow-hidden border border-[#2b271f]">

      {/* Preview */}
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

        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 px-2.5 py-2 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[#f2ede2] text-xs font-medium">Upscale</span>
            <TokenCostBadge cost={TOKEN_COST} />
          </div>
          <button
            onClick={onUpscale}
            disabled={!canRun}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c5a572] hover:bg-[#9b7d4c] disabled:opacity-40 disabled:cursor-not-allowed text-[#0a0908] text-xs font-medium transition-colors"
          >
            {processing ? (
              <><Loader2 size={11} className="animate-spin" /> Upscaling…</>
            ) : (
              <><Maximize2 size={11} />
                {!selectedImage ? 'No image' : !canAfford ? 'Need tokens' : 'Upscale'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings */}
      <div className="border-t border-[#2b271f] bg-[#121110] px-3 py-3 space-y-3">

        {/* Mode toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[#9a9387] text-xs">Mode</span>
          <div className="flex rounded-lg overflow-hidden border border-[#2b271f]">
            {[
              { id: 'target', label: 'Target MP' },
              { id: 'factor', label: 'Factor ×' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => onUpscaleModeChange(id)}
                disabled={processing || batchRunning}
                className={`px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                  upscaleMode === id
                    ? 'bg-[#c5a572] text-[#0a0908]'
                    : 'text-[#9a9387] hover:text-[#f2ede2]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Target MP */}
        {upscaleMode === 'target' && (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[#9a9387] text-xs">Target resolution</span>
              <p className="text-[#6b665c] text-[10px]">1–128 MP</p>
            </div>
            <NumberInput
              value={targetMp}
              onChange={onTargetMpChange}
              min={1}
              max={128}
              suffix="MP"
            />
          </div>
        )}

        {/* Factor */}
        {upscaleMode === 'factor' && (
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[#9a9387] text-xs">Scale factor</span>
              <p className="text-[#6b665c] text-[10px]">1–8× per side</p>
            </div>
            <NumberInput
              value={factor}
              onChange={onFactorChange}
              min={1}
              max={8}
              step={0.5}
              suffix="×"
            />
          </div>
        )}

        {/* Enhance details */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[#9a9387] text-xs">Enhance details</span>
            <p className="text-[#6b665c] text-[10px]">Sharpen fine textures</p>
          </div>
          <button
            onClick={() => onEnhanceDetailsChange(!enhanceDetails)}
            disabled={processing || batchRunning}
            className={`relative w-9 h-5 rounded-full transition-colors disabled:opacity-40 ${
              enhanceDetails ? 'bg-[#c5a572]' : 'bg-[#2b271f]'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                enhanceDetails ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </button>
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
            <p className="text-[10px] text-[#9a9387] whitespace-nowrap">
              {batchQueue.length} image{batchQueue.length !== 1 ? 's' : ''}
              {' · '}
              <span className="text-[#c5a572]">{totalCost}t</span>
            </p>
            <button
              onClick={onStartBatch}
              disabled={batchRunning || !canAfford}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c5a572] hover:bg-[#9b7d4c] disabled:opacity-40 text-[#0a0908] text-xs font-medium transition-colors whitespace-nowrap"
            >
              <Play size={10} />
              {batchRunning ? 'Running…' : `Batch (${batchQueue.length})`}
            </button>
          </div>
        </div>
      )}

      {!canAfford && balance >= 0 && (
        <div className="px-3 py-2 bg-[#121110] border-t border-[#2b271f]">
          <p className="text-[#f59e0b] text-[10px] text-center">
            Not enough tokens — redeem a voucher on the Tokens page
          </p>
        </div>
      )}
    </div>
  )
}
