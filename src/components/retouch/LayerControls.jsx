export default function LayerControls({ layers, onOpacityChange }) {
  return (
    <div className="space-y-2">
      <p className="text-[#9a9387] text-xs font-medium uppercase tracking-wide">Layers</p>
      <div className="space-y-3">
        {layers.map(layer => (
          <div key={layer.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#f2ede2] text-xs">{layer.name}</span>
              <span className="text-[#9a9387] text-xs">{Math.round(layer.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(layer.opacity * 100)}
              onChange={e => onOpacityChange(layer.name, Number(e.target.value) / 100)}
              className="w-full h-1.5 bg-[#16140f] rounded-full appearance-none cursor-pointer accent-[#c5a572]"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
