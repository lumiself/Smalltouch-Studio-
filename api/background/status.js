import fetch from 'node-fetch'

const REPLICATE_BASE = 'https://api.replicate.com/v1'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { predictionId } = req.query
  if (!predictionId) return res.status(400).json({ error: 'Missing predictionId' })

  try {
    const replicateRes = await fetch(
      `${REPLICATE_BASE}/predictions/${encodeURIComponent(predictionId)}`,
      {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
        },
      }
    )

    if (!replicateRes.ok) {
      return res.status(replicateRes.status).json({ error: 'Failed to fetch prediction' })
    }

    const data = await replicateRes.json()
    return res.status(200).json({
      status: data.status,
      output: data.output ?? null,
      error: data.error ?? null,
    })
  } catch (err) {
    console.error('background/status error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
