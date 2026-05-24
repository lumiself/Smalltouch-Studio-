import { X, Play } from 'lucide-react'

function statusDotClass(status) {
  if (status === 'processing') return 'bg-[#f59e0b]'
  if (status === 'completed') return 'bg-[#22c55e]'
  if (status === 'failed') return 'bg-[#ef4444]'
  return 'bg-[#3a3a3a]'
}

export default function PlaygroundPanel({
  selectedImage,
  batchQueue,
  batchStatuses = {},
  batchRunning,
  activePreset,
  onRemoveFromBatch,
  onStartBatch,
}) {
  const hasBatch = batchQueue.length > 0
  const totalCost = activePreset ? batchQueue.length * activePreset.tokenCost : 0

  return (
    <div className="shrink-0 border-t border-[#2a2a2a] flex flex-col h-[260px] md:h-[280px]">
      {/* Large image preview */}
      <div className="flex-1 bg-[#0d0d0d] flex items-center justify-center overflow-hidden min-h-0">
        {selectedImage ? (
          <img
            src={selectedImage.preview}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <p className="text-[#333] text-xs">Select an image to preview</p>
        )}
      </div>

      {/* Batch filmstrip */}
      {hasBatch && (
        <div className="shrink-0 h-[76px] border-t border-[#2a2a2a] bg-[#141414] flex items-center gap-2 px-3">
          {/* Thumbnails */}
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto min-w-0 pr-1">
            {batchQueue.map(item => (
              <div
                key={item.id}
                className="relative shrink-0 w-12 h-12 rounded overflow-hidden group/thumb"
              >
                <img src={item.preview} alt={item.name} className="w-full h-full object-cover" />
                <span
                  className={`absolute bottom-0.5 left-0.5 w-2 h-2 rounded-full ${statusDotClass(batchStatuses[item.id])}`}
                />
                {!batchRunning && (
                  <button
                    onClick={() => onRemoveFromBatch(item.id)}
                    className="absolute top-0 right-0 w-4 h-4 bg-black/70 rounded-bl flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 md:opacity-0 transition-opacity"
                  >
                    <X size={8} className="text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Run batch control */}
          <div className="shrink-0 flex flex-col items-end gap-1">
            {activePreset ? (
              <>
                <p className="text-[10px] text-[#a3a3a3] whitespace-nowrap">
                  {activePreset.name}
                  {' · '}
                  <span className="text-[#a855f7]">{totalCost}t</span>
                </p>
                <button
                  onClick={onStartBatch}
                  disabled={batchRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a855f7] hover:bg-[#7c3aed] disabled:opacity-40 text-white text-xs font-medium transition-colors whitespace-nowrap"
                >
                  <Play size={10} />
                  {batchRunning ? 'Running…' : `Batch (${batchQueue.length})`}
                </button>
              </>
            ) : (
              <p className="text-[10px] text-[#a3a3a3] text-right whitespace-nowrap leading-snug">
                Select a preset<br />to run batch
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
