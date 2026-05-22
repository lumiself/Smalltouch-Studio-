import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { panels } from '../registry/panels'
import { systemPresets } from '../registry/presets'
import { canUsePanel, getRequiredPackage } from '../lib/access'
import { useAuth } from '../hooks/useAuth'
import TokenCostBadge from '../components/shared/TokenCostBadge'

export default function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const featured = systemPresets.slice(0, 3)

  function handlePanelClick(panel) {
    if (panel.status === 'coming_soon') return
    if (!canUsePanel(profile, panel.id)) return
    navigate(panel.route)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8">
      <div>
        <h1 className="font-display font-bold text-[#f5f5f5] text-2xl">What would you like to do today?</h1>
        <p className="text-[#a3a3a3] text-sm mt-1">Choose a tool to get started</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {panels.map(panel => {
          const locked = panel.status === 'coming_soon' || (!canUsePanel(profile, panel.id) && panel.status === 'active')
          const requiredPkg = locked && panel.status === 'active' ? getRequiredPackage(panel.id) : null

          return (
            <button
              key={panel.id}
              onClick={() => handlePanelClick(panel)}
              disabled={panel.status === 'coming_soon'}
              className={`relative bg-[#1a1a1a] border rounded-xl p-5 text-left transition-all space-y-2 ${
                locked
                  ? 'border-[#2a2a2a] opacity-60 cursor-not-allowed'
                  : 'border-[#2a2a2a] hover:border-[#a855f7]/50 hover:bg-[#1a1a1a]/80 cursor-pointer'
              }`}
            >
              <span className="text-2xl">{panel.icon}</span>
              <div>
                <p className="text-[#f5f5f5] font-medium text-sm">{panel.name}</p>
                <p className="text-[#a3a3a3] text-xs mt-0.5">{panel.description}</p>
              </div>
              {panel.status === 'coming_soon' && (
                <span className="absolute top-2 right-2 text-[10px] text-[#a3a3a3] bg-[#242424] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Lock size={9} /> Soon
                </span>
              )}
              {requiredPkg && panel.status !== 'coming_soon' && (
                <span className="absolute top-2 right-2 text-[10px] text-[#a3a3a3] bg-[#242424] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Lock size={9} /> {requiredPkg.name}+
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        <h2 className="font-display font-semibold text-[#f5f5f5] text-base">Featured Presets</h2>
        <div className="grid grid-cols-3 gap-3">
          {featured.map(preset => (
            <button
              key={preset.id}
              onClick={() => navigate('/retouch')}
              className="bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#a855f7]/40 rounded-xl p-4 text-left transition-all group"
            >
              <span className="text-xl">{preset.icon}</span>
              <p className="text-[#f5f5f5] text-sm font-medium mt-2">{preset.name}</p>
              <p className="text-[#a3a3a3] text-xs mt-0.5 leading-snug">{preset.description}</p>
              <TokenCostBadge cost={preset.tokenCost} className="mt-2" />
            </button>
          ))}
        </div>
      </div>

      {!profile?.package_id && (
        <div className="bg-[#a855f7]/10 border border-[#a855f7]/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-[#f5f5f5] text-sm font-medium">No tokens yet</p>
            <p className="text-[#a3a3a3] text-xs mt-0.5">Redeem a voucher code to get started</p>
          </div>
          <button
            onClick={() => navigate('/tokens')}
            className="px-4 py-2 rounded-lg bg-[#a855f7] hover:bg-[#7c3aed] text-white text-sm font-medium transition-colors"
          >
            Redeem Code
          </button>
        </div>
      )}
    </div>
  )
}
