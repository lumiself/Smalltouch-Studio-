export default function ProgressBar({ progress = 0, label = '', className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="h-1.5 bg-[#16140f] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#c5a572] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      {label && <p className="text-[#9a9387] text-xs">{label}</p>}
    </div>
  )
}
