import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'
import sharp from 'sharp'

const BLEND_MAP = {
  'normal': 'over',
  'soft-light': 'soft-light',
  'linear-light': 'overlay',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.slice(7)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' })

  let body = ''
  for await (const chunk of req) body += chunk
  const { jobId, layers } = JSON.parse(body)

  if (!jobId || !Array.isArray(layers)) {
    return res.status(400).json({ error: 'Missing jobId or layers' })
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('output_path, input_path')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (!job) return res.status(404).json({ error: 'Job not found' })

  const [{ data: zipUrlData }, { data: origUrlData }] = await Promise.all([
    supabase.storage.from('outputs').createSignedUrl(job.output_path, 60),
    supabase.storage.from('inputs').createSignedUrl(job.input_path, 60),
  ])

  if (!zipUrlData?.signedUrl || !origUrlData?.signedUrl) {
    return res.status(500).json({ error: 'Could not access stored files' })
  }

  const [zipRes, origRes] = await Promise.all([
    fetch(zipUrlData.signedUrl),
    fetch(origUrlData.signedUrl),
  ])

  const [zipArrayBuf, origArrayBuf] = await Promise.all([
    zipRes.arrayBuffer(),
    origRes.arrayBuffer(),
  ])

  const zip = await JSZip.loadAsync(Buffer.from(zipArrayBuf))
  const layerMap = {}
  for (const [name, entry] of Object.entries(zip.files)) {
    if (name.endsWith('.png') && !name.includes('result')) {
      const buf = await entry.async('nodebuffer')
      const pluginName = name.replace('.png', '').replace(/_/g, ' ')
      layerMap[pluginName] = buf
    }
  }

  const compositeInputs = []
  for (const layer of layers) {
    const buf = layerMap[layer.name]
    if (!buf) continue
    const opacity = Math.max(0, Math.min(1, layer.opacity ?? 1))
    const blendMode = BLEND_MAP[layer.blendMode] || 'over'

    const adjustedBuf = opacity < 0.999
      ? await sharp(buf).ensureAlpha().linear([1, 1, 1, opacity], [0, 0, 0, 0]).png().toBuffer()
      : buf

    compositeInputs.push({ input: adjustedBuf, blend: blendMode })
  }

  const origBuffer = Buffer.from(origArrayBuf)

  const outputBuffer = compositeInputs.length > 0
    ? await sharp(origBuffer).composite(compositeInputs).jpeg({ quality: 92 }).toBuffer()
    : await sharp(origBuffer).jpeg({ quality: 92 }).toBuffer()

  res.setHeader('Content-Type', 'image/jpeg')
  res.setHeader('Content-Disposition', `attachment; filename="retouched_${jobId.slice(0, 8)}.jpg"`)
  res.setHeader('Content-Length', outputBuffer.length)
  return res.status(200).send(outputBuffer)
}
