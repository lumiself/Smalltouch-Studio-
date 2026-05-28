import { createClient } from '@supabase/supabase-js'

function supabaseClient() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function parseBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  try {
    return JSON.parse(Buffer.concat(chunks).toString())
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = req.headers.authorization?.slice(7)
  if (!token) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = supabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

  const body = await parseBody(req)
  if (!body) return res.status(400).json({ error: 'Invalid JSON' })

  const { outputPaths } = body
  if (!Array.isArray(outputPaths) || outputPaths.length === 0) {
    return res.status(400).json({ error: 'outputPaths must be a non-empty array' })
  }

  for (const path of outputPaths) {
    if (!path.startsWith(`${user.id}/`)) {
      return res.status(403).json({ error: 'Access denied' })
    }
  }

  const inputPaths = []
  for (const outputPath of outputPaths) {
    try {
      const { data: blob, error: dlError } = await supabase.storage
        .from('outputs')
        .download(outputPath)
      if (dlError) throw new Error(dlError.message)

      const ext = outputPath.split('.').pop()
      const newJobId = crypto.randomUUID()
      const newInputPath = `${user.id}/${newJobId}_original.${ext}`

      const { error: upError } = await supabase.storage
        .from('inputs')
        .upload(newInputPath, blob, { contentType: 'image/jpeg', upsert: true })
      if (upError) throw new Error(upError.message)

      inputPaths.push({ originalPath: outputPath, newInputPath })
    } catch (err) {
      return res.status(500).json({ error: `Failed to copy file: ${err.message}` })
    }
  }

  return res.status(200).json({ inputPaths })
}
