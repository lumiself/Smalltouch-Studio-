import { Download, RefreshCw, CheckCircle, Clock, XCircle } from 'lucide-react'
import ProgressBar from '../shared/ProgressBar'
import BeforeAfterSlider from '../shared/BeforeAfterSlider'

const STATUS_ICONS = {
  completed: <CheckCircle size={14} className="text-[#22c55e]" />,
  processing: <Clock size={14} className="text-[#f59e0b]" />,
  uploading: <Clock size={14} className="text-[#f59e0b]" />,
  submitting: <Clock size={14} className="text-[#f59e0b]" />,
  downloading: <Clock size={14} className="text-[#f59e0b]" />,
  failed: <XCircle size={14} className="text-[#ef4444]" />,
}

export default function ResultsPanel({ jobs, onDownloadAll }) {
  const completed = jobs.filter(j => j.status === 'completed')
  const active = jobs.filter(j => !['completed', 'failed'].includes(j.status))
  const failed = jobs.filter(j => j.status === 'failed')

  async function downloadResult(job) {
    if (!job.result?.url) return
    const a = document.createElement('a')
    a.href = job.result.url
    a.download = `retouched_${job.id.slice(0, 8)}.jpg`
    a.click()
  }

  return (
    <aside className="w-full md:w-72 shrink-0 bg-[#1a1a1a] border-l border-[#2a2a2a] flex flex-col overflow-hidden">
      <div className="p-3 border-b border-[#2a2a2a] flex items-center justify-between">
        <h3 className="text-[#f5f5f5] text-sm font-medium">Results {jobs.length > 0 && `(${jobs.length})`}</h3>
        {completed.length > 1 && (
          <button onClick={onDownloadAll} className="flex items-center gap-1 text-xs text-[#a855f7] hover:text-[#7c3aed] transition-colors">
            <Download size={12} />
            All
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {jobs.length === 0 && (
          <p className="text-[#a3a3a3] text-xs text-center mt-8">Results will appear here</p>
        )}

        {[...jobs].reverse().map(job => (
          <div key={job.id} className="bg-[#242424] rounded-xl overflow-hidden">
            <div className="p-2.5 flex items-center gap-2">
              {STATUS_ICONS[job.status] || <Clock size={14} className="text-[#a3a3a3]" />}
              <span className="text-[#f5f5f5] text-xs font-medium flex-1 truncate">
                {job.presetName || (job.type === 'advanced_edit' ? 'Advanced Edit' : job.id.slice(0, 8))}
              </span>
            </div>

            {['processing', 'uploading', 'submitting', 'downloading'].includes(job.status) && (
              <div className="px-2.5 pb-2.5">
                <ProgressBar
                  progress={job.progress || 0}
                  label={job.step ? `Processing ${job.step}...` : 'Processing...'}
                />
              </div>
            )}

            {job.status === 'completed' && job.result && (
              <>
                <BeforeAfterSlider
                  beforeSrc={job.originalFile ? URL.createObjectURL(job.originalFile) : null}
                  afterSrc={job.result.url}
                  className="w-full h-40"
                />
                <div className="p-2">
                  <button
                    onClick={() => downloadResult(job)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#a855f7]/20 hover:bg-[#a855f7]/30 text-[#a855f7] text-xs font-medium transition-colors"
                  >
                    <Download size={12} />
                    Download
                  </button>
                </div>
              </>
            )}

            {job.status === 'failed' && (
              <div className="px-2.5 pb-2.5">
                <p className="text-[#ef4444] text-xs">{job.error || 'Processing failed'}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}
