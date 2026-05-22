import { useRef } from 'react'
import { Upload, X, ImagePlus } from 'lucide-react'

export default function LibraryPanel({ images, selectedImage, onSelect, onUpload, batchQueue, onAddToBatch, onRemoveFromBatch, onStartBatch, batchRunning }) {
  const fileInputRef = useRef(null)

  function handleFiles(files) {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (valid.length) onUpload(valid)
  }

  function onDrop(e) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <aside className="w-60 shrink-0 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col overflow-hidden">
      <div className="p-3 border-b border-[#2a2a2a]">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#a855f7] hover:bg-[#7c3aed] text-white text-sm font-medium transition-colors"
        >
          <Upload size={14} />
          Upload Images
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      <div
        className="flex-1 overflow-y-auto p-2 space-y-1"
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
      >
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-[#2a2a2a] rounded-lg text-center p-3">
            <ImagePlus size={20} className="text-[#a3a3a3] mb-1" />
            <p className="text-[#a3a3a3] text-xs">Drop images here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {images.map(img => (
              <button
                key={img.id}
                onClick={() => onSelect(img)}
                className={`relative aspect-square rounded overflow-hidden border-2 transition-colors ${
                  selectedImage?.id === img.id ? 'border-[#a855f7]' : 'border-transparent hover:border-[#2a2a2a]'
                }`}
              >
                <img src={img.preview} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {batchQueue.length > 0 && (
        <div className="border-t border-[#2a2a2a] p-3 space-y-2">
          <p className="text-[#a3a3a3] text-xs font-medium uppercase tracking-wide">Batch Queue</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {batchQueue.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <img src={item.preview} alt="" className="w-8 h-8 rounded object-cover" />
                <span className="flex-1 text-[#f5f5f5] truncate">{item.name}</span>
                {!batchRunning && (
                  <button onClick={() => onRemoveFromBatch(item.id)} className="text-[#a3a3a3] hover:text-[#ef4444]">
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!batchRunning && (
            <button
              onClick={onStartBatch}
              className="w-full py-1.5 px-3 rounded bg-[#a855f7]/20 hover:bg-[#a855f7]/30 text-[#a855f7] text-xs font-medium transition-colors"
            >
              Start Batch ({batchQueue.length})
            </button>
          )}
        </div>
      )}
    </aside>
  )
}
