import { Download, CheckCircle, Clock, XCircle, RotateCcw, ArrowRight } from 'lucide-react'
import JSZip from 'jszip'
import ProgressBar from './ProgressBar'
import BeforeAfterSlider from './BeforeAfterSlider'

const STATUS_ICONS = {
  completed:   <CheckCircle size={14} className="text-[#22c55e]" />,
  processing:  <Clock size={14} className="text-[#f59e0b]" />,
  uploading:   <Clock size={14} className="text-[#f59e0b]" />,
  submitting:  <Clock size={14} className="text-[#f59e0b]" />,
  downloading: <Clock size={14} className="text-[#f59e0b]" />,
  failed:      <XCircle size={14} className="text-[#ef4444]" />,
}

function fileStem(job) {
  const name = job.originalFile?.name
  return name ? name.replace(/\.[^.]+$/, '') : null
}

function suffixFromJob(job) {
  if (job.presetName) return job.presetName.replace(/\s+/g, '_').toLowerCase()
  const MAP = { quick_enhance: 'enhanced', advanced_edit: 'retouched', bg_replace: 'bg_replaced', bg_flux_preset: 'bg_replaced' }
  return MAP[job.type] || 'result'
}

export default function ResultsPanel({ jobs = [], onRetry, onContinue }) {
  const downloadable = jobs.filter(j => j.status === 'completed' && j.result?.url)

  async function downloadResult(job) {
    const res = await fetch(job.result.url)
    const blob = await res.blob()
    const ext = blob.type.includes('png') ? 'png' : 'jpg'
    const stem = fileStem(job)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = stem ? `${stem}_${suffixFromJob(job)}.${ext}` : `result_${job.id.slice(0, 8)}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadAll() {
    if (!downloadable.length) return
    const zip = new JSZip()
    await Promise.all(downloadable.map(async (job, i) => {
      try {
        const res = await fetch(job.result.url)
        const blob = await res.blob()
        const ext = blob.type.includes('png') ? 'png' : 'jpg'
        const stem = fileStem(job)
        const label = stem
          ? `${stem}_${suffixFromJob(job)}.${ext}`
          : (job.presetName ? `${job.presetName.replace(/\s+/g, '_')}_${i + 1}.${ext}` : `result_${i + 1}.${ext}`)
        zip.file(label, blob)
      } catch {}
    }))
    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = 'smalltouch_results.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <aside className="w-full shrink-0 bg-[#1a1a1a] flex flex-col overflow-hidden h-full">
      <div className="p-3 border-b border-[#2a2a2a] flex items-center justify-between shrink-0">
        <h3 className="text-[#f5f5f5] text-sm font-medium">
          Results{jobs.length > 0 ? ` (${jobs.length})` : ''}
        </h3>
        {downloadable.length > 1 && (
          <button
            onClick={downloadAll}
            className="flex items-center gap-1 text-xs text-[#a855f7] hover:text-[#7c3aed] transition-colors"
          >
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
              {STATUS_ICONS[job.status] ?? <Clock size={14} className="text-[#a3a3a3]" />}
              <span className="text-[#f5f5f5] text-xs font-medium flex-1 truncate">
                {job.presetName || job.id.slice(0, 8)}
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

            {job.status === 'completed' && job.result?.url && (
              <>
                <BeforeAfterSlider
                  beforeSrc={job.originalFile ? URL.createObjectURL(job.originalFile) : (job.chainedPreview ?? null)}
                  afterSrc={job.result.url}
                  className="w-full h-40"
                />
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => downloadResult(job)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#a855f7]/20 hover:bg-[#a855f7]/30 text-[#a855f7] text-xs font-medium transition-colors"
                  >
                    <Download size={12} />
                    Download
                  </button>
                  {onContinue && job.result.outputPath && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => onContinue(job, 'retouch')}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-[#a3a3a3] hover:text-[#f5f5f5] text-xs font-medium transition-colors"
                      >
                        <ArrowRight size={11} />
                        Retouch
                      </button>
                      <button
                        onClick={() => onContinue(job, 'background')}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-[#a3a3a3] hover:text-[#f5f5f5] text-xs font-medium transition-colors"
                      >
                        <ArrowRight size={11} />
                        Background
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {job.status === 'failed' && (
              <div className="px-2.5 pb-2.5 space-y-2">
                <p className="text-[#ef4444] text-xs">{job.error || 'Processing failed'}</p>
                {onRetry && (job.externalJobId || (job.originalFile && (job.presetData || job.pluginConfig))) && (
                  <button
                    onClick={() => onRetry(job)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] text-xs font-medium transition-colors"
                  >
                    <RotateCcw size={11} />
                    {job.externalJobId ? 'Resume' : 'Retry'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}
