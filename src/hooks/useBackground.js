import { useState } from 'react'

const POLL_INTERVAL_MS = 3000

export function useBackground() {
  const [jobs, setJobs] = useState([])

  function updateJob(id, patch) {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j))
  }

  async function pollBgStatus(predictionId, jobId, onUpdate) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/background/status?predictionId=${predictionId}`)
          const data = await res.json()

          if (data.status === 'succeeded') {
            clearInterval(interval)
            const output = Array.isArray(data.output) ? data.output[0] : data.output
            if (onUpdate) onUpdate({ status: 'succeeded', output })
            resolve(output)
          } else if (data.status === 'failed' || data.status === 'canceled') {
            clearInterval(interval)
            reject(new Error(data.error || 'Processing failed'))
          } else {
            if (onUpdate) onUpdate({ status: data.status })
            updateJob(jobId, { status: data.status })
          }
        } catch (err) {
          clearInterval(interval)
          reject(err)
        }
      }, POLL_INTERVAL_MS)
    })
  }

  return { jobs, updateJob, pollBgStatus }
}
