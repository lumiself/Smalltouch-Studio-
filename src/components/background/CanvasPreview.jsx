import { useRef, useEffect, useCallback } from 'react'
import { Download } from 'lucide-react'

export default function CanvasPreview({
  originalUrl,
  subjectUrl,
  bgType,
  bgColor,
  gradientStart,
  gradientEnd,
  gradientAngle,
  blurAmount,
  aiBgUrl,
  stockBgUrl,
  expandResult,
  onDownloadReady,
}) {
  const canvasRef = useRef(null)

  const renderCanvas = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')

    if (expandResult) {
      const img = await loadImage(expandResult)
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
      return
    }

    if (!subjectUrl && !originalUrl) {
      canvas.width = 800
      canvas.height = 600
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    if (!subjectUrl && originalUrl) {
      const img = await loadImage(originalUrl)
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)
      return
    }

    const subject = await loadImage(subjectUrl)
    canvas.width = subject.naturalWidth
    canvas.height = subject.naturalHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (bgType === 'transparent') {
      drawCheckered(ctx, canvas.width, canvas.height)
    } else if (bgType === 'solid') {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else if (bgType === 'gradient') {
      const rad = (gradientAngle * Math.PI) / 180
      const cx = canvas.width / 2
      const cy = canvas.height / 2
      const halfLen = Math.sqrt(cx * cx + cy * cy)
      const x0 = cx - Math.cos(rad) * halfLen
      const y0 = cy - Math.sin(rad) * halfLen
      const x1 = cx + Math.cos(rad) * halfLen
      const y1 = cy + Math.sin(rad) * halfLen
      const grad = ctx.createLinearGradient(x0, y0, x1, y1)
      grad.addColorStop(0, gradientStart)
      grad.addColorStop(1, gradientEnd)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    } else if (bgType === 'blur' && originalUrl) {
      const orig = await loadImage(originalUrl)
      ctx.filter = `blur(${blurAmount}px)`
      ctx.drawImage(orig, 0, 0, canvas.width, canvas.height)
      ctx.filter = 'none'
    } else if (bgType === 'ai' && aiBgUrl) {
      const bg = await loadImage(aiBgUrl)
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height)
    } else if (bgType === 'stock' && stockBgUrl) {
      const bg = await loadImage(stockBgUrl)
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height)
    } else {
      drawCheckered(ctx, canvas.width, canvas.height)
    }

    ctx.drawImage(subject, 0, 0)
  }, [originalUrl, subjectUrl, bgType, bgColor, gradientStart, gradientEnd, gradientAngle, blurAmount, aiBgUrl, stockBgUrl, expandResult])

  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `background_result_${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }, [])

  useEffect(() => {
    if (onDownloadReady) onDownloadReady(handleDownload)
  }, [onDownloadReady, handleDownload])

  const isEmpty = !originalUrl && !subjectUrl && !expandResult

  return (
    <div className="flex flex-col h-full bg-[#111]">
      <div className="flex-1 flex items-center justify-center overflow-hidden p-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#2a2a2a] rounded-2xl w-full max-w-lg h-[400px]">
            <p className="text-[#555] text-sm">Upload an image to get started</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              maxHeight: '65vh',
              objectFit: 'contain',
              borderRadius: '8px',
              display: 'block',
            }}
          />
        )}
      </div>

      {!isEmpty && (
        <div className="border-t border-[#2a2a2a] px-6 py-3 flex justify-end">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 py-2 px-4 rounded-lg bg-[#242424] hover:bg-[#2a2a2a] text-[#f5f5f5] text-sm font-medium transition-colors border border-[#3a3a3a]"
          >
            <Download size={14} />
            Download Result
          </button>
        </div>
      )}
    </div>
  )
}

function drawCheckered(ctx, width, height) {
  const size = 16
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      ctx.fillStyle = (Math.floor(x / size) + Math.floor(y / size)) % 2 === 0 ? '#cccccc' : '#999999'
      ctx.fillRect(x, y, size, size)
    }
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
