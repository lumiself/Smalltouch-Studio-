import { createClient } from '@supabase/supabase-js'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode() {
  const seg = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
  return `SMTCH-${seg()}-${seg()}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.slice(7))
  if (error || !user) return res.status(401).json({ error: 'Invalid token' })
  if (user.email !== process.env.ADMIN_EMAIL) return res.status(403).json({ error: 'Forbidden' })

  const { quantity = 1, packageId, value } = req.body || {}
  if (!packageId || !value || !quantity || quantity < 1 || quantity > 500) {
    return res.status(400).json({ error: 'Invalid parameters' })
  }

  const rows = Array.from({ length: quantity }, () => ({
    code: generateCode(),
    package_id: packageId,
    value: Number(value),
    is_used: false,
  }))

  const { data, error: insertError } = await supabase
    .from('token_vouchers')
    .insert(rows)
    .select('code')

  if (insertError) return res.status(500).json({ error: 'Failed to generate codes' })

  return res.status(200).json({ codes: data.map(r => r.code), count: data.length })
}
