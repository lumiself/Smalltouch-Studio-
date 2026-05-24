import { useRef } from 'react'
import { Upload, ImagePlus, Plus } from 'lucide-react'

export default function LibraryPanel({
  images, selectedImage, onSelect, onUpload,
  batchQueue, onAddToBatch,
}) {
  const fileInputRef = useRef(null)
  const batchQueueIds = new Set(batchQueue.map(i => i.id))

  function handleFiles(files) {
    const valid = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (valid.length) onUpload(valid)
  }

  function onDrop(e) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <aside className="w-full md:w-[220px] shrink-0 bg-[#1a1a1a] flex flex-col overflow-hidden h-full">
      {/* Upload button */}
      <div className="p-3 border-b border-[#2a2a2a] shrink-0">
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

      {/* Image grid */}
      <div
        className="flex-1 overflow-y-auto p-2"
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
              <div key={img.id} className="relative group aspect-square">
                <button
                  onClick={() => onSelect(img)}
                  className={`w-full h-full rounded overflow-hidden border-2 transition-colors ${
                    selectedImage?.id === img.id
                      ? 'border-[#a855f7]'
                      : 'border-transparent hover:border-[#3a3a3a]'
                  }`}
                >
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                </button>
                {!batchQueueIds.has(img.id) && (
                  <button
                    onClick={() => onAddToBatch(img)}
                    title="Add to batch"
                    className="absolute top-1 right-1 w-5 h-5 rounded bg-black/60 hover:bg-[#a855f7] text-white flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  >
                    <Plus size={10} />
                  </button>
                )}
                {batchQueueIds.has(img.id) && (
                  <span className="absolute top-1 right-1 w-5 h-5 rounded bg-[#a855f7]/80 flex items-center justify-center">
                    <Plus size={10} className="text-white rotate-45" />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
