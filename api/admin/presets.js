import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function verifyAdmin(req, supabase) {
  const token = req.headers.authorization?.slice(7)
  if (!token) return null
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user || user.email !== adminEmail) return null
  return user
}

export default async function handler(req, res) {
  const supabase = adminClient()
  const user = await verifyAdmin(req, supabase)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('system_presets')
      .select('*')
      .order('sort_order')
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ presets: data })
  }

  let body = ''
  for await (const chunk of req) body += chunk
  const parsed = body ? JSON.parse(body) : {}

  if (req.method === 'POST') {
    const { preset_key, panel, name, icon, description, categories, token_cost, payload, before_image_url, after_image_url, status, sort_order } = parsed
    if (!preset_key || !name || !payload) {
      return res.status(400).json({ error: 'Missing required fields: preset_key, name, payload' })
    }
    const { data, error } = await supabase
      .from('system_presets')
      .insert({
        preset_key,
        panel: panel ?? 'retouch',
        name,
        icon: icon ?? '✨',
        description: description ?? '',
        categories: categories ?? [],
        token_cost: token_cost ?? 1,
        payload,
        before_image_url: before_image_url ?? null,
        after_image_url: after_image_url ?? null,
        status: status ?? 'active',
        sort_order: sort_order ?? 0,
      })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ preset: data })
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = parsed
    if (!id) return res.status(400).json({ error: 'Missing id' })
    delete updates.preset_key
    updates.updated_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('system_presets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    if (!data) return res.status(404).json({ error: 'Preset not found' })
    return res.status(200).json({ preset: data })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    if (!id) return res.status(400).json({ error: 'Missing id' })
    const { error, count } = await supabase
      .from('system_presets')
      .delete({ count: 'exact' })
      .eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    if (count === 0) return res.status(404).json({ error: 'Preset not found' })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
