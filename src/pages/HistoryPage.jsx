import { useEffect, useState } from 'react'
import { Download, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getOutputUrl } from '../lib/storage'
import { useAuth } from '../hooks/useAuth'
import { SkeletonJobRow } from '../components/shared/Skeleton'

export default function HistoryPage() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

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
    a.download = `result_${job.id.slice(0, 8)}.jpg`
    a.click()
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
          {jobs.map(job => (
            <div key={job.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-4">
              {job.status === 'completed'
                ? <CheckCircle size={16} className="text-[#22c55e] shrink-0" />
                : <XCircle size={16} className="text-[#ef4444] shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-[#f5f5f5] text-sm font-medium truncate">{job.operation.replace(/_/g, ' ')}</p>
                <p className="text-[#a3a3a3] text-xs">{new Date(job.created_at).toLocaleString()} · {job.tokens_used} token{job.tokens_used !== 1 ? 's' : ''}</p>
              </div>
              {job.status === 'completed' && job.output_path && (
                <button onClick={() => downloadJob(job)} className="text-[#a855f7] hover:text-[#7c3aed] transition-colors">
                  <Download size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
