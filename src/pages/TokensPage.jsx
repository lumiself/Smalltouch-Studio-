import { useState } from 'react'
import { Coins } from 'lucide-react'
import { packages } from '../registry/packages'
import { useAuth } from '../hooks/useAuth'
import { useTokens } from '../hooks/useTokens'
import { useToast } from '../contexts/ToastContext'

export default function TokensPage() {
  const { profile } = useAuth()
  const { balance, redeemVoucher } = useTokens()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const currentPkg = packages.find(p => p.id === profile?.package_id)

  async function handleRedeem(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await redeemVoucher(code.trim().toUpperCase())
      toast.success(`Added ${result.tokensAdded} tokens. New balance: ${result.newBalance}.`)
      setCode('')
    } catch (err) {
      toast.error(err.message || 'Redemption failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif font-bold text-[#f2ede2] text-2xl">Tokens</h1>
        <p className="text-[#9a9387] text-sm mt-1">Manage your token balance and redemptions</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#121110] border border-[#2b271f] rounded-xl p-4">
          <p className="text-[#9a9387] text-xs mb-1">Current Balance</p>
          <div className="flex items-center gap-2">
            <Coins size={20} className="text-[#c5a572]" />
            <span className="font-serif font-bold text-[#f2ede2] text-2xl">{balance}</span>
          </div>
        </div>
        <div className="bg-[#121110] border border-[#2b271f] rounded-xl p-4">
          <p className="text-[#9a9387] text-xs mb-1">Package</p>
          {currentPkg ? (
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentPkg.icon}</span>
              <span className="font-serif font-bold text-[#f2ede2] text-lg">{currentPkg.name}</span>
            </div>
          ) : (
            <p className="text-[#9a9387] text-sm">No package</p>
          )}
        </div>
      </div>

      <div className="bg-[#121110] border border-[#2b271f] rounded-xl p-5 space-y-4">
        <h2 className="font-serif font-semibold text-[#f2ede2] text-base">Redeem Voucher</h2>
        <p className="text-[#9a9387] text-sm">Enter your voucher code below. Codes follow the format <code className="text-[#c5a572]">SMTCH-XXXX-XXXX</code>.</p>

        <form onSubmit={handleRedeem} className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="SMTCH-XXXX-XXXX"
            className="flex-1 px-3 py-2.5 bg-[#16140f] border border-[#2b271f] rounded-lg text-[#f2ede2] text-sm font-mono placeholder:text-[#9a9387] focus:outline-none focus:border-[#c5a572] uppercase tracking-wider transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="px-5 py-2.5 rounded-lg bg-[#c5a572] hover:bg-[#9b7d4c] disabled:opacity-50 text-[#0a0908] font-medium text-sm transition-colors whitespace-nowrap"
          >
            {loading ? 'Redeeming...' : 'Redeem'}
          </button>
        </form>

      </div>

      <div className="space-y-3">
        <h2 className="font-serif font-semibold text-[#f2ede2] text-base">Token Packages</h2>
        <p className="text-[#9a9387] text-sm">Purchase physical vouchers — tokens are added when you redeem a code.</p>
        <div className="grid grid-cols-1 gap-3">
          {packages.map(pkg => (
            <div
              key={pkg.id}
              className={`bg-[#121110] border rounded-xl p-4 flex items-center gap-4 ${
                currentPkg?.id === pkg.id ? 'border-[#c5a572]/50' : 'border-[#2b271f]'
              }`}
            >
              <span className="text-2xl">{pkg.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[#f2ede2] font-medium text-sm">{pkg.name}</span>
                  {currentPkg?.id === pkg.id && (
                    <span className="text-[10px] text-[#c5a572] bg-[#c5a572]/20 px-1.5 py-0.5 rounded-full">Current</span>
                  )}
                </div>
                <p className="text-[#9a9387] text-xs mt-0.5">{pkg.description}</p>
                <p className="text-[#9a9387] text-xs mt-1">{pkg.tokens} tokens · Batch up to {pkg.limits.maxBatchSize} images</p>
              </div>
              <span className="font-serif font-bold text-[#f2ede2]" style={{ color: pkg.color }}>{pkg.price}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
