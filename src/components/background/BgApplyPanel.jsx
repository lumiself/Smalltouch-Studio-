import { Wand2, Loader2 } from 'lucide-react'
import TokenCostBadge from '../shared/TokenCostBadge'

export default function BgApplyPanel({ selectedImage, selectedPreset, processing, balance, onApply }) {
  const canRun = selectedImage && selectedPreset && !processing && balance >= selectedPreset.tokenCost

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
      <h3 className="text-[#f5f5f5] text-sm font-semibold">Apply Background</h3>

      {/* Image preview */}
      <div className="w-full aspect-video bg-[#0d0d0d] rounded-lg overflow-hidden flex items-center justify-center">
        {selectedImage ? (
          <img
            src={selectedImage.previewUrl}
            alt={selectedImage.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <p className="text-[#555] text-xs">No image selected — upload one from the library</p>
        )}
      </div>

      {/* Selected preset info */}
      {selectedPreset ? (
        <div className="flex items-center justify-between bg-[#242424] rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">{selectedPreset.icon}</span>
            <div className="min-w-0">
              <p className="text-[#f5f5f5] text-xs font-medium truncate">{selectedPreset.name}</p>
              <p className="text-[#555] text-[10px] truncate">{selectedPreset.description}</p>
            </div>
          </div>
          <TokenCostBadge cost={selectedPreset.tokenCost} />
        </div>
      ) : (
        <p className="text-[#555] text-xs text-center py-1">Select a preset above to continue</p>
      )}

      <button
        onClick={() => onApply(selectedPreset)}
        disabled={!canRun}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#a855f7] hover:bg-[#7c3aed] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
      >
        {processing ? (
          <><Loader2 size={14} className="animate-spin" /> Generating…</>
        ) : (
          <><Wand2 size={14} /> Generate Background</>
        )}
      </button>

      {balance < (selectedPreset?.tokenCost ?? 2) && balance >= 0 && selectedPreset && (
        <p className="text-[#f59e0b] text-[10px] text-center">
          Not enough tokens — redeem a voucher on the Tokens page
        </p>
      )}
    </div>
  )
}
