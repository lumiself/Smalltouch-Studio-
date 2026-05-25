import { useEffect, useState } from 'react'
import { Download, CheckCircle, XCircle, RotateCcw, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getOutputUrl } from '../lib/storage'
import { useAuth } from '../hooks/useAuth'
import { SkeletonJobRow } from '../components/shared/Skeleton'

async function isZipBlob(blob) {
  const buf = await blob.slice(0, 2).arrayBuffer()
  const b = new Uint8Array(buf)
  return b[0] === 0x50 && b[1] === 0x4B
}

export default function HistoryPage() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [resumingId, setResumingId] = useState(null)
  const [resumeErrors, setResumeErrors] = useState({})

  useEffect(() => {
    if (!user) return
    supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setJobs(data || [])
        setLoading(false)
      })
  }, [user])

  async function downloadJob(job) {
    if (!job.output_path) return
    const url = await getOutputUrl(job.output_path)
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `result_${job.id.slice(0, 8)}.${job.output_path.endsWith('.zip') ? 'zip' : 'jpg'}`
    a.click()
  }

  async function handleResume(job) {
    setResumingId(job.id)
    setResumeErrors(prev => { const next = { ...prev }; delete next[job.id]; return next })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // Check whether the result is still available on Retouch4me
      const statusRes = await fetch(`/api/retouch/status?jobId=${job.external_job_id}`)
      if (!statusRes.ok) throw new Error('Could not reach the processing server')
      const statusData = await statusRes.json()

      if (statusData.state === 'failed') {
        throw new Error(statusData.reason || 'Job failed on the processing server')
      }
      if (statusData.state !== 'completed') {
        throw new Error('Job is still processing — wait a moment and try again')
      }

      // Pull the result file
      const downloadRes = await fetch(
        `/api/retouch/download?jobId=${job.external_job_id}&internalJobId=${job.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (downloadRes.status === 404) {
        throw new Error('Result has expired — Retouch4me only keeps results for 24 hours')
      }
      if (!downloadRes.ok) throw new Error('Download failed')
      const blob = await downloadRes.blob()

      const zip = blob.type.includes('zip') || await isZipBlob(blob)
      const ext = zip ? 'zip' : 'jpg'
      const outputPath = `${job.user_id}/${job.id}_result.${ext}`

      const { error: uploadError } = await supabase.storage.from('outputs').upload(outputPath, blob, {
        contentType: zip ? 'application/zip' : 'image/jpeg',
        upsert: true,
      })
      if (uploadError) throw new Error('Failed to save result to storage')

      await supabase.from('jobs').update({ status: 'completed', output_path: outputPath }).eq('id', job.id)
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'completed', output_path: outputPath } : j))
    } catch (err) {
      setResumeErrors(prev => ({ ...prev, [job.id]: err.message }))
    } finally {
      setResumingId(null)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[#f5f5f5] text-2xl">History</h1>
        <p className="text-[#a3a3a3] text-sm mt-1">Your recent processing jobs (last 50)</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonJobRow key={i} />)}
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-[#a3a3a3] text-sm text-center py-12">No jobs yet. Start retouching to see results here.</p>
      ) : (
        <div className="space-y-2">
          {jobs.map(job => {
            const canResume = job.status === 'failed' && job.external_job_id && !job.output_path
            const isResuming = resumingId === job.id
            const resumeError = resumeErrors[job.id]

            return (
              <div key={job.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-center gap-4">
                  {job.status === 'completed'
                    ? <CheckCircle size={16} className="text-[#22c55e] shrink-0" />
                    : <XCircle size={16} className="text-[#ef4444] shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-[#f5f5f5] text-sm font-medium truncate">{job.operation.replace(/_/g, ' ')}</p>
                    <p className="text-[#a3a3a3] text-xs">{new Date(job.created_at).toLocaleString()} · {job.tokens_used} token{job.tokens_used !== 1 ? 's' : ''}</p>
                  </div>
                  {job.status === 'completed' && job.output_path && (
                    <button onClick={() => downloadJob(job)} className="text-[#a855f7] hover:text-[#7c3aed] transition-colors shrink-0">
                      <Download size={16} />
                    </button>
                  )}
                  {canResume && (
                    <button
                      onClick={() => handleResume(job)}
                      disabled={isResuming}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#a855f7]/15 hover:bg-[#a855f7]/25 disabled:opacity-50 text-[#a855f7] text-xs font-medium transition-colors shrink-0"
                    >
                      {isResuming
                        ? <Loader size={11} className="animate-spin" />
                        : <RotateCcw size={11} />
                      }
                      {isResuming ? 'Resuming…' : 'Resume'}
                    </button>
                  )}
                </div>
                {resumeError && (
                  <p className="mt-2 text-[#ef4444] text-xs pl-8">{resumeError}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
