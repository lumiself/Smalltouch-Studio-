import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7))
  if (error || !user) return res.status(401).json({ error: 'Invalid token' })
  if (user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' })

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
