import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function parseJsonBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString()
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

async function verifyAdmin(req, supabase) {
  const token = req.headers.authorization?.slice(7)
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user || user.email !== process.env.ADMIN_EMAIL) return null
  return user
}

export default async function handler(req, res) {
  const supabase = adminClient()
  const user = await verifyAdmin(req, supabase)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const subpath = (req.url || '').split('?')[0].split('/').filter(Boolean)[2]

  // GET /api/admin/users
  if (subpath === 'users') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    const { data, error: dbError } = await supabase
      .from('users')
      .select('id, email, token_balance, package_id, package_set_at, created_at')
      .order('created_at', { ascending: false })
    if (dbError) return res.status(500).json({ error: 'Failed to fetch users' })
    return res.status(200).json({ users: data })
  }

  // GET /api/admin/codes
  if (subpath === 'codes') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    let query = supabase
      .from('token_vouchers')
      .select('id, code, package_id, value, is_used, used_by, used_at, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (req.query.used === 'true') query = query.eq('is_used', true)
    else if (req.query.used === 'false') query = query.eq('is_used', false)
    const { data, error: dbError } = await query
    if (dbError) return res.status(500).json({ error: 'Failed to fetch codes' })
    return res.status(200).json({ codes: data })
  }

  // POST /api/admin/update-package
  if (subpath === 'update-package') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const { userId, packageId } = await parseJsonBody(req)
    if (!userId || !packageId) return res.status(400).json({ error: 'Missing userId or packageId' })
    const { error: updateError } = await supabase
      .from('users')
      .update({ package_id: packageId, package_set_at: new Date().toISOString() })
      .eq('id', userId)
    if (updateError) return res.status(500).json({ error: 'Failed to update package' })
    return res.status(200).json({ success: true })
  }

  // GET/POST/PATCH/DELETE /api/admin/presets
  if (subpath === 'presets') {
    if (req.method === 'GET') {
      const { data, error } = await supabase.from('system_presets').select('*').order('sort_order')
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ presets: data })
    }

    if (req.method === 'POST') {
      const { preset_key, panel, name, icon, description, categories, token_cost, payload, before_image_url, after_image_url, status, sort_order } = await parseJsonBody(req)
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
      const { id, ...updates } = await parseJsonBody(req)
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

  return res.status(404).json({ error: 'Not found' })
}
