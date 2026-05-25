import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTokens } from '../hooks/useTokens'
import { useBackground } from '../hooks/useBackground'
import { useToast } from '../contexts/ToastContext'
import { useLibrary } from '../contexts/LibraryContext'
import { canUseAction } from '../lib/access'
import PanelShell from '../components/shared/PanelShell'
import BgPresets from '../components/background/BgPresets'
import BgApplyPanel from '../components/background/BgApplyPanel'

const TOOL_NAV = [
  { id: 'presets', label: 'Presets', Icon: Image },
]

export default function BackgroundPage() {
  const { user, profile } = useAuth()
  const { balance, deductTokens, refundTokens } = useTokens()
  const { selectedImage, batchQueue, removeFromBatch, addJob, updateJob } = useLibrary()
  const { runReplace } = useBackground({ addJob, updateJob })
  const toast = useToast()
  const navigate = useNavigate()

  const [activeTool, setActiveTool] = useState('presets')
  const [activePreset, setActivePreset] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchStatuses, setBatchStatuses] = useState({})
  const [mobileTab, setMobileTab] = useState('tools')

  const handleApply = useCallback(async (preset) => {
    if (!user || !selectedImage || !preset) return
    if (!canUseAction(profile, 'bg_replace')) { navigate('/tokens'); return }

    setProcessing(true)
    let deducted = false
    try {
      await deductTokens(user.id, preset.tokenCost, crypto.randomUUID(), 'bg_replace')
      deducted = true
      await runReplace({ userId: user.id, file: selectedImage.file, preset })
      setMobileTab('results')
    } catch (err) {
      if (deducted) {
        try { await refundTokens(user.id, preset.tokenCost) } catch {}
      }
      toast.error(err.message || 'Background replacement failed')
    } finally {
      setProcessing(false)
    }
  }, [user, selectedImage, profile, deductTokens, refundTokens, runReplace, navigate, toast])

  const handleStartBatch = useCallback(async () => {
    if (!activePreset || batchQueue.length === 0 || batchRunning) return
    if (!canUseAction(profile, 'bg_replace')) { navigate('/tokens'); return }

    setBatchRunning(true)
    setBatchStatuses(Object.fromEntries(batchQueue.map(img => [img.id, 'pending'])))

    const runItem = async (img) => {
      setBatchStatuses(prev => ({ ...prev, [img.id]: 'processing' }))
      let deducted = false
      try {
        await deductTokens(user.id, activePreset.tokenCost, crypto.randomUUID(), 'bg_replace')
        deducted = true
        await runReplace({ userId: user.id, file: img.file, preset: activePreset })
        setBatchStatuses(prev => ({ ...prev, [img.id]: 'completed' }))
      } catch (err) {
        if (deducted) {
          try { await refundTokens(user.id, activePreset.tokenCost) } catch {}
        }
        setBatchStatuses(prev => ({ ...prev, [img.id]: 'failed' }))
        toast.error(`Failed: ${img.name}`)
      }
    }

    await Promise.allSettled(batchQueue.map(runItem))
    setBatchRunning(false)
    toast.success('Batch complete')
    setMobileTab('results')
  }, [activePreset, batchQueue, batchRunning, profile, user, deductTokens, refundTokens, runReplace, navigate, toast])

  return (
    <PanelShell mobileTab={mobileTab} onMobileTabChange={setMobileTab}>

      {/* Mobile horizontal tool switcher */}
      <div className="md:hidden flex shrink-0 border-b border-[#2a2a2a] bg-[#161616]">
        {TOOL_NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTool(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              activeTool === id
                ? 'text-[#a855f7] border-[#a855f7]'
                : 'text-[#555] border-transparent hover:text-[#a3a3a3]'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Desktop vertical tool nav */}
        <nav className="hidden md:flex flex-col w-[72px] shrink-0 border-r border-[#2a2a2a] bg-[#161616] py-3 gap-1">
          {TOOL_NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTool(id)}
              className={`flex flex-col items-center gap-1.5 py-3 mx-1.5 rounded-lg transition-colors ${
                activeTool === id
                  ? 'bg-[#a855f7]/15 text-[#a855f7]'
                  : 'text-[#555] hover:text-[#a3a3a3] hover:bg-[#242424]'
              }`}
            >
              <Icon size={16} />
              <span className="text-[10px] font-medium leading-tight text-center">{label}</span>
            </button>
          ))}
        </nav>

        {/* Tool content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeTool === 'presets' && (
            <>
              <BgPresets
                selectedPreset={activePreset}
                onPresetSelect={setActivePreset}
              />
              <BgApplyPanel
                selectedImage={selectedImage}
                selectedPreset={activePreset}
                processing={processing}
                balance={balance}
                onApply={handleApply}
                batchQueue={batchQueue}
                batchStatuses={batchStatuses}
                batchRunning={batchRunning}
                onRemoveFromBatch={removeFromBatch}
                onStartBatch={handleStartBatch}
              />
            </>
          )}
        </div>
      </div>

    </PanelShell>
  )
}
