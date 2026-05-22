export default function ProgressBar({ progress = 0, label = '', className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="h-1.5 bg-[#242424] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#a855f7] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      {label && <p className="text-[#a3a3a3] text-xs">{label}</p>}
    </div>
  )
}
