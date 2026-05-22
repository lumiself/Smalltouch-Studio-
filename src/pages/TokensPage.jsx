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
        <h1 className="font-display font-bold text-[#f5f5f5] text-2xl">Tokens</h1>
        <p className="text-[#a3a3a3] text-sm mt-1">Manage your token balance and redemptions</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-[#a3a3a3] text-xs mb-1">Current Balance</p>
          <div className="flex items-center gap-2">
            <Coins size={20} className="text-[#a855f7]" />
            <span className="font-display font-bold text-[#f5f5f5] text-2xl">{balance}</span>
          </div>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-[#a3a3a3] text-xs mb-1">Package</p>
          {currentPkg ? (
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentPkg.icon}</span>
              <span className="font-display font-bold text-[#f5f5f5] text-lg">{currentPkg.name}</span>
            </div>
          ) : (
            <p className="text-[#a3a3a3] text-sm">No package</p>
          )}
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 space-y-4">
        <h2 className="font-display font-semibold text-[#f5f5f5] text-base">Redeem Voucher</h2>
        <p className="text-[#a3a3a3] text-sm">Enter your voucher code below. Codes follow the format <code className="text-[#a855f7]">SMTCH-XXXX-XXXX</code>.</p>

        <form onSubmit={handleRedeem} className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="SMTCH-XXXX-XXXX"
            className="flex-1 px-3 py-2.5 bg-[#242424] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-sm font-mono placeholder:text-[#a3a3a3] focus:outline-none focus:border-[#a855f7] uppercase tracking-wider transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="px-5 py-2.5 rounded-lg bg-[#a855f7] hover:bg-[#7c3aed] disabled:opacity-50 text-white font-medium text-sm transition-colors whitespace-nowrap"
          >
            {loading ? 'Redeeming...' : 'Redeem'}
          </button>
        </form>

      </div>

      <div className="space-y-3">
        <h2 className="font-display font-semibold text-[#f5f5f5] text-base">Token Packages</h2>
        <p className="text-[#a3a3a3] text-sm">Purchase physical vouchers — tokens are added when you redeem a code.</p>
        <div className="grid grid-cols-1 gap-3">
          {packages.map(pkg => (
            <div
              key={pkg.id}
              className={`bg-[#1a1a1a] border rounded-xl p-4 flex items-center gap-4 ${
                currentPkg?.id === pkg.id ? 'border-[#a855f7]/50' : 'border-[#2a2a2a]'
              }`}
            >
              <span className="text-2xl">{pkg.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[#f5f5f5] font-medium text-sm">{pkg.name}</span>
                  {currentPkg?.id === pkg.id && (
                    <span className="text-[10px] text-[#a855f7] bg-[#a855f7]/20 px-1.5 py-0.5 rounded-full">Current</span>
                  )}
                </div>
                <p className="text-[#a3a3a3] text-xs mt-0.5">{pkg.description}</p>
                <p className="text-[#a3a3a3] text-xs mt-1">{pkg.tokens} tokens · Batch up to {pkg.limits.maxBatchSize} images</p>
              </div>
              <span className="font-display font-bold text-[#f5f5f5]" style={{ color: pkg.color }}>{pkg.price}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
