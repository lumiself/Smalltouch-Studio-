import fetch from 'node-fetch'

const RETOUCH4ME_BASE = 'https://retoucher.hz.labs.retouch4.me/api/v1'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { jobId } = req.query
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' })

  try {
    const statusRes = await fetch(`${RETOUCH4ME_BASE}/retoucher/status/${encodeURIComponent(jobId)}`)
    if (!statusRes.ok) {
      return res.status(statusRes.status).json({ error: 'Failed to fetch status' })
    }
    const data = await statusRes.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('retouch/status error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
