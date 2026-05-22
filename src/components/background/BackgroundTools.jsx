import { useRef, useState, useEffect } from 'react'
import { Upload, Loader2, CheckCircle2, Download } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function BackgroundTools({
  file,
  originalUrl,
  step,
  removing,
  subjectUrl,
  activeTool,
  onToolChange,
  bgType,
  onBgTypeChange,
  bgColor,
  onBgColorChange,
  gradientStart,
  onGradientStartChange,
  gradientEnd,
  onGradientEndChange,
  gradientAngle,
  onGradientAngleChange,
  aiPrompt,
  onAiPromptChange,
  aiGenerating,
  onAiGenerate,
  aiBgUrl,
  blurAmount,
  onBlurAmountChange,
  expandPrompt,
  onExpandPromptChange,
  expandPadding,
  onExpandPaddingChange,
  expanding,
  onExpand,
  stockBgUrl,
  onStockBgSelect,
  onUpload,
  onRemoveBg,
  onApply,
  onDownload,
  balance,
}) {
  const fileInputRef = useRef(null)
  const [stockImages, setStockImages] = useState([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.storage.from('backgrounds').list('', { limit: 20 })
      if (!data) return
      const items = data
        .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f.name))
        .map(f => {
          const { data: { publicUrl } } = supabase.storage.from('backgrounds').getPublicUrl(f.name)
          return { name: f.name, url: publicUrl }
        })
      setStockImages(items)
    }
    load()
  }, [])

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (f) onUpload(f)
    e.target.value = ''
  }

  return (
    <div className="p-4 space-y-5">
      <div>
        <p className="text-[#a3a3a3] text-xs font-medium uppercase tracking-wider mb-2">Upload Image</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-dashed border-[#3a3a3a] text-[#a3a3a3] hover:border-[#a855f7] hover:text-[#a855f7] transition-colors text-sm"
        >
          <Upload size={15} />
          {file ? 'Replace Image' : 'Upload Image'}
        </button>
        {originalUrl && (
          <div className="mt-2 rounded-lg overflow-hidden border border-[#2a2a2a]">
            <img src={originalUrl} alt="Original" className="w-full h-28 object-cover" />
          </div>
        )}
      </div>

      <div className="border-t border-[#2a2a2a]" />

      <div>
        <p className="text-[#a3a3a3] text-xs font-medium uppercase tracking-wider mb-2">Background Removal</p>
        {step === 'idle' && (
          <p className="text-[#555] text-xs">Upload an image first</p>
        )}
        {(step === 'uploading') && (
          <div className="flex items-center gap-2 text-[#a3a3a3] text-xs">
            <Loader2 size={13} className="animate-spin" />
            Uploading...
          </div>
        )}
        {step === 'uploaded' && !subjectUrl && !removing && (
          <button
            onClick={onRemoveBg}
            disabled={balance < 1}
            className="w-full py-2 px-3 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            Remove Background · 1 token
          </button>
        )}
        {removing && (
          <div className="flex items-center gap-2 text-[#a3a3a3] text-xs">
            <Loader2 size={13} className="animate-spin" />
            Removing background...
          </div>
        )}
        {subjectUrl && !removing && (
          <div className="flex items-center gap-2 text-emerald-400 text-xs">
            <CheckCircle2 size={13} />
            Background removed
          </div>
        )}
      </div>

      {subjectUrl && (
        <>
          <div className="border-t border-[#2a2a2a]" />

          <div>
            <p className="text-[#a3a3a3] text-xs font-medium uppercase tracking-wider mb-2">Tool</p>
            <div className="flex gap-1">
              {['replace', 'blur', 'expand'].map(tool => (
                <button
                  key={tool}
                  onClick={() => onToolChange(tool)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                    activeTool === tool
                      ? 'bg-[#a855f7] text-white'
                      : 'bg-[#242424] text-[#a3a3a3] hover:text-[#f5f5f5]'
                  }`}
                >
                  {tool === 'expand' ? 'Expand' : tool === 'blur' ? 'Blur' : 'Replace'}
                </button>
              ))}
            </div>
          </div>

          {activeTool === 'replace' && (
            <ReplaceBgControls
              bgType={bgType}
              onBgTypeChange={onBgTypeChange}
              bgColor={bgColor}
              onBgColorChange={onBgColorChange}
              gradientStart={gradientStart}
              onGradientStartChange={onGradientStartChange}
              gradientEnd={gradientEnd}
              onGradientEndChange={onGradientEndChange}
              gradientAngle={gradientAngle}
              onGradientAngleChange={onGradientAngleChange}
              aiPrompt={aiPrompt}
              onAiPromptChange={onAiPromptChange}
              aiGenerating={aiGenerating}
              onAiGenerate={onAiGenerate}
              aiBgUrl={aiBgUrl}
              stockImages={stockImages}
              stockBgUrl={stockBgUrl}
              onStockBgSelect={onStockBgSelect}
              onApply={onApply}
              balance={balance}
            />
          )}

          {activeTool === 'blur' && (
            <BlurBgControls
              blurAmount={blurAmount}
              onBlurAmountChange={onBlurAmountChange}
              onApply={() => onApply('blur')}
              balance={balance}
            />
          )}

          {activeTool === 'expand' && (
            <ExpandControls
              expandPrompt={expandPrompt}
              onExpandPromptChange={onExpandPromptChange}
              expandPadding={expandPadding}
              onExpandPaddingChange={onExpandPaddingChange}
              expanding={expanding}
              onExpand={onExpand}
              balance={balance}
            />
          )}

          <div className="border-t border-[#2a2a2a]" />

          <button
            onClick={onDownload}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#242424] hover:bg-[#2a2a2a] text-[#f5f5f5] text-sm font-medium transition-colors border border-[#3a3a3a]"
          >
            <Download size={14} />
            Download PNG
          </button>
        </>
      )}
    </div>
  )
}

function ReplaceBgControls({
  bgType, onBgTypeChange,
  bgColor, onBgColorChange,
  gradientStart, onGradientStartChange,
  gradientEnd, onGradientEndChange,
  gradientAngle, onGradientAngleChange,
  aiPrompt, onAiPromptChange,
  aiGenerating, onAiGenerate,
  aiBgUrl,
  stockImages, stockBgUrl, onStockBgSelect,
  onApply, balance,
}) {
  const types = [
    { id: 'transparent', label: 'Transparent' },
    { id: 'solid', label: 'Solid Color' },
    { id: 'gradient', label: 'Gradient' },
    { id: 'ai', label: 'AI Generate' },
    { id: 'stock', label: 'Stock Library' },
  ]

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[#a3a3a3] text-xs font-medium uppercase tracking-wider mb-2">Background Type</p>
        <div className="space-y-1">
          {types.map(t => (
            <label key={t.id} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="bgType"
                value={t.id}
                checked={bgType === t.id}
                onChange={() => onBgTypeChange(t.id)}
                className="accent-[#a855f7]"
              />
              <span className="text-sm text-[#a3a3a3] group-hover:text-[#f5f5f5] transition-colors">{t.label}</span>
            </label>
          ))}
        </div>
      </div>

      {bgType === 'solid' && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#a3a3a3]">Color</label>
          <input
            type="color"
            value={bgColor}
            onChange={e => onBgColorChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
          />
          <span className="text-xs text-[#555] font-mono">{bgColor}</span>
        </div>
      )}

      {bgType === 'gradient' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#a3a3a3] w-12">From</label>
            <input
              type="color"
              value={gradientStart}
              onChange={e => onGradientStartChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#a3a3a3] w-12">To</label>
            <input
              type="color"
              value={gradientEnd}
              onChange={e => onGradientEndChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-xs text-[#a3a3a3]">Angle</label>
              <span className="text-xs text-[#555]">{gradientAngle}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              value={gradientAngle}
              onChange={e => onGradientAngleChange(Number(e.target.value))}
              className="w-full accent-[#a855f7]"
            />
          </div>
        </div>
      )}

      {bgType === 'ai' && (
        <div className="space-y-2">
          <textarea
            value={aiPrompt}
            onChange={e => onAiPromptChange(e.target.value)}
            placeholder="Describe the background... e.g. soft bokeh studio backdrop, light gray"
            rows={3}
            className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder-[#555] resize-none focus:outline-none focus:border-[#a855f7] transition-colors"
          />
          <button
            onClick={onAiGenerate}
            disabled={!aiPrompt.trim() || aiGenerating || balance < 2}
            className="w-full py-2 px-3 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            {aiGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={13} className="animate-spin" />
                Generating...
              </span>
            ) : 'Generate · 2 tokens'}
          </button>
          {aiBgUrl && (
            <div className="rounded-lg overflow-hidden border border-[#2a2a2a]">
              <img src={aiBgUrl} alt="Generated background" className="w-full h-20 object-cover" />
            </div>
          )}
        </div>
      )}

      {bgType === 'stock' && (
        <div>
          {stockImages.length === 0 ? (
            <p className="text-[#555] text-xs">No stock backgrounds available</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {stockImages.map(img => (
                <button
                  key={img.name}
                  onClick={() => onStockBgSelect(img.url)}
                  className={`rounded-md overflow-hidden border-2 transition-colors ${
                    stockBgUrl === img.url ? 'border-[#a855f7]' : 'border-transparent hover:border-[#3a3a3a]'
                  }`}
                >
                  <img src={img.url} alt={img.name} className="w-full h-14 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {bgType !== 'ai' && (
        <button
          onClick={() => onApply(bgType)}
          disabled={balance < 1 || (bgType === 'stock' && !stockBgUrl)}
          className="w-full py-2 px-3 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          Apply · 1 token
        </button>
      )}
    </div>
  )
}

function BlurBgControls({ blurAmount, onBlurAmountChange, onApply, balance }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex justify-between mb-1">
          <label className="text-xs text-[#a3a3a3]">Blur Amount</label>
          <span className="text-xs text-[#555]">{blurAmount}px</span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          value={blurAmount}
          onChange={e => onBlurAmountChange(Number(e.target.value))}
          className="w-full accent-[#a855f7]"
        />
      </div>
      <button
        onClick={onApply}
        disabled={balance < 1}
        className="w-full py-2 px-3 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
      >
        Apply Blur · 1 token
      </button>
    </div>
  )
}

function ExpandControls({ expandPrompt, onExpandPromptChange, expandPadding, onExpandPaddingChange, expanding, onExpand, balance }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-[#a3a3a3] block mb-1">Padding (px)</label>
        <input
          type="number"
          min={50}
          max={400}
          value={expandPadding}
          onChange={e => onExpandPaddingChange(Math.max(50, Math.min(400, Number(e.target.value))))}
          className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#a855f7] transition-colors"
        />
      </div>
      <div>
        <label className="text-xs text-[#a3a3a3] block mb-1">Fill Prompt</label>
        <input
          type="text"
          value={expandPrompt}
          onChange={e => onExpandPromptChange(e.target.value)}
          placeholder="e.g. seamless studio background"
          className="w-full bg-[#242424] border border-[#3a3a3a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] placeholder-[#555] focus:outline-none focus:border-[#a855f7] transition-colors"
        />
      </div>
      <button
        onClick={onExpand}
        disabled={!expandPrompt.trim() || expanding || balance < 2}
        className="w-full py-2 px-3 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
      >
        {expanding ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={13} className="animate-spin" />
            Expanding...
          </span>
        ) : 'Expand Canvas · 2 tokens'}
      </button>
      <p className="text-[#555] text-xs">Expansion works best on images with clear subjects</p>
    </div>
  )
}
