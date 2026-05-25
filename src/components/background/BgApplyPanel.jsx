import { Loader2, Wand2 } from 'lucide-react'
import TokenCostBadge from '../shared/TokenCostBadge'

export default function BgApplyPanel({ selectedImage, selectedPreset, processing, balance, onApply }) {
  const canAfford = selectedPreset ? balance >= selectedPreset.tokenCost : false
  const canRun = !!(selectedImage && selectedPreset && !processing && canAfford)

  return (
    <div className="rounded-xl overflow-hidden border border-[#2a2a2a]">

      {/* Large preview with action bar overlay */}
      <div className="h-52 bg-[#0d0d0d] relative overflow-hidden">
        {selectedImage ? (
          <img
            src={selectedImage.preview}
            alt="Preview"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#2a2a2a] text-xs">Select an image to preview</p>
          </div>
        )}

        {/* Preset action bar — overlaid at the bottom of the preview */}
        {selectedPreset && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 px-2.5 py-2 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0">{selectedPreset.icon}</span>
              <span className="text-[#f5f5f5] text-xs font-medium truncate">{selectedPreset.name}</span>
              <TokenCostBadge cost={selectedPreset.tokenCost} />
            </div>
            <button
              onClick={() => onApply(selectedPreset)}
              disabled={!canRun}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a855f7] hover:bg-[#7c3aed] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
            >
              {processing ? (
                <><Loader2 size={11} className="animate-spin" /> Replacing…</>
              ) : (
                <><Wand2 size={11} />
                  {!selectedImage
                    ? 'No image'
                    : !canAfford
                    ? 'Need tokens'
                    : 'Replace BG'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {!selectedPreset && (
        <div className="px-3 py-2.5 bg-[#141414] border-t border-[#2a2a2a]">
          <p className="text-[#555] text-xs text-center">Select a preset above to continue</p>
        </div>
      )}

      {balance < (selectedPreset?.tokenCost ?? 2) && balance >= 0 && selectedPreset && (
        <div className="px-3 py-2 bg-[#141414] border-t border-[#2a2a2a]">
          <p className="text-[#f59e0b] text-[10px] text-center">
            Not enough tokens — redeem a voucher on the Tokens page
          </p>
        </div>
      )}
    </div>
  )
}
