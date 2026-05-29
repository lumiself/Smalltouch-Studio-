import { useState, useRef, useCallback } from 'react'

export default function BeforeAfterSlider({ beforeSrc, afterSrc, className = '' }) {
  const [position, setPosition] = useState(50)
  const containerRef = useRef(null)
  const dragging = useRef(false)

  const updatePosition = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setPosition((x / rect.width) * 100)
  }, [])

  const onMouseDown = (e) => { dragging.current = true; updatePosition(e.clientX) }
  const onMouseMove = (e) => { if (dragging.current) updatePosition(e.clientX) }
  const onMouseUp = () => { dragging.current = false }
  const onTouchStart = (e) => { dragging.current = true; updatePosition(e.touches[0].clientX) }
  const onTouchMove = (e) => { if (dragging.current) updatePosition(e.touches[0].clientX) }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none cursor-col-resize rounded-lg ${className}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onMouseUp}
    >
      {beforeSrc ? (
        <img src={beforeSrc} alt="Before" className="w-full h-full object-cover" draggable={false} />
      ) : (
        <div className="w-full h-full bg-[#16140f] flex items-center justify-center text-[#9a9387] text-xs">Before</div>
      )}

      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        {afterSrc ? (
          <img src={afterSrc} alt="After" className="w-full h-full object-cover absolute inset-0" draggable={false} />
        ) : (
          <div className="w-full h-full bg-[#121110] flex items-center justify-center text-[#9a9387] text-xs">After</div>
        )}
      </div>

      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none" style={{ left: `${position}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 bg-white rounded-full shadow-lg flex items-center justify-center">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M4 2L1 6L4 10M8 2L11 6L8 10" stroke="#2b271f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none">Before</div>
      <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none">After</div>
    </div>
  )
}
