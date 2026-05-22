import { createClient } from '@supabase/supabase-js'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode() {
  const seg = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
  return `SMTCH-${seg()}-${seg()}`
}

function supabaseClient() {
  return createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function verifyUser(supabase, token) {
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return (error || !user) ? null : user
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  const supabase = supabaseClient()
  const user = await verifyUser(supabase, authHeader.slice(7))
  if (!user) return res.status(401).json({ error: 'Invalid token' })

  const subpath = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path

  // POST /api/tokens/generate  (admin only)
  if (subpath === 'generate') {
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
    const { data, error: insertError } = await supabase.from('token_vouchers').insert(rows).select('code')
    if (insertError) return res.status(500).json({ error: 'Failed to generate codes' })
    return res.status(200).json({ codes: data.map(r => r.code), count: data.length })
  }

  // POST /api/tokens/redeem
  if (subpath === 'redeem') {
    const { code } = req.body || {}
    if (!code) return res.status(400).json({ error: 'Missing voucher code' })

    const normalizedCode = code.trim().toUpperCase()
    const { data: voucher, error: voucherError } = await supabase
      .from('token_vouchers')
      .select('*')
      .eq('code', normalizedCode)
      .single()

    if (voucherError || !voucher) return res.status(404).json({ error: 'Code not found' })
    if (voucher.is_used) return res.status(409).json({ error: 'Code already redeemed' })

    const { data: userRecord } = await supabase
      .from('users')
      .select('token_balance, package_id')
      .eq('id', user.id)
      .single()

    const currentBalance = userRecord?.token_balance ?? 0
    const newBalance = currentBalance + voucher.value
    const { packages } = await import('../../src/registry/packages.js')
    const voucherPkg = packages.find(p => p.id === voucher.package_id)
    const currentPkg = packages.find(p => p.id === userRecord?.package_id)
    const currentTier = packages.indexOf(currentPkg)
    const voucherTier = packages.indexOf(voucherPkg)
    const newPackageId = voucherTier > currentTier ? voucher.package_id : userRecord?.package_id

    const { error: updateError } = await supabase
      .from('users')
      .update({ token_balance: newBalance, package_id: newPackageId })
      .eq('id', user.id)
    if (updateError) return res.status(500).json({ error: 'Failed to update balance' })

    await supabase
      .from('token_vouchers')
      .update({ is_used: true, used_by: user.id, used_at: new Date().toISOString() })
      .eq('id', voucher.id)

    return res.status(200).json({ tokensAdded: voucher.value, newBalance, packageId: newPackageId })
  }

  return res.status(404).json({ error: 'Not found' })
}
