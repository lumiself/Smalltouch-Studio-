import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { fetchWithRetry, supabaseRetry } from '../lib/fetchWithRetry'

export function useTokens() {
  const { profile, refreshProfile } = useAuth()

  async function deductTokens(userId, amount, jobId, operation) {
    const { data, error } = await supabaseRetry(() => supabase.rpc('deduct_tokens', {
      p_user_id: userId,
      p_amount: amount,
      p_job_id: jobId,
      p_operation: operation,
    }))
    if (error) throw error
    await refreshProfile()
    return data
  }

  async function refundTokens(userId, amount) {
    const { error } = await supabaseRetry(() => supabase.rpc('refund_tokens', {
      p_user_id: userId,
      p_amount: amount,
    }))
    if (error) throw error
    await refreshProfile()
  }

  async function redeemVoucher(code) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetchWithRetry('/api/tokens/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ code }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Redemption failed')
    await refreshProfile()
    return data
  }

  return {
    balance: profile?.token_balance ?? 0,
    packageId: profile?.package_id ?? null,
    deductTokens,
    refundTokens,
    redeemVoucher,
  }
}
