import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userToken = authHeader.slice(7)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser(userToken)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  const { code } = req.body || {}
  if (!code) return res.status(400).json({ error: 'Missing voucher code' })

  const normalizedCode = code.trim().toUpperCase()

  const { data: voucher, error: voucherError } = await supabase
    .from('token_vouchers')
    .select('*')
    .eq('code', normalizedCode)
    .single()

  if (voucherError || !voucher) {
    return res.status(404).json({ error: 'Code not found' })
  }

  if (voucher.is_used) {
    return res.status(409).json({ error: 'Code already redeemed' })
  }

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

  if (updateError) {
    return res.status(500).json({ error: 'Failed to update balance' })
  }

  await supabase
    .from('token_vouchers')
    .update({ is_used: true, used_by: user.id, used_at: new Date().toISOString() })
    .eq('id', voucher.id)

  return res.status(200).json({
    tokensAdded: voucher.value,
    newBalance,
    packageId: newPackageId,
  })
}
