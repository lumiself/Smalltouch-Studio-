import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7))
  if (error || !user) return res.status(401).json({ error: 'Invalid token' })
  if (user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' })

  const { userId, packageId } = req.body || {}
  if (!userId || !packageId) return res.status(400).json({ error: 'Missing userId or packageId' })

  const { error: updateError } = await supabase
    .from('users')
    .update({ package_id: packageId, package_set_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateError) return res.status(500).json({ error: 'Failed to update package' })

  return res.status(200).json({ success: true })
}
