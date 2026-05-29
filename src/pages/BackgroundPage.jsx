import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image, Maximize2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTokens } from '../hooks/useTokens'
import { useBackground } from '../hooks/useBackground'
import { useUpscale } from '../hooks/useUpscale'
import { useToast } from '../contexts/ToastContext'
import { useLibrary } from '../contexts/LibraryContext'
import { canUseAction } from '../lib/access'
import PanelShell from '../components/shared/PanelShell'
import BgPresets from '../components/background/BgPresets'
import BgApplyPanel from '../components/background/BgApplyPanel'
import UpscalePanel from '../components/background/UpscalePanel'

const TOOL_NAV = [
  { id: 'presets', label: 'Presets', Icon: Image },
  { id: 'upscale', label: 'Upscale', Icon: Maximize2 },
]

export default function BackgroundPage() {
  const { user, profile } = useAuth()
  const { balance, deductTokens, refundTokens } = useTokens()
  const { selectedImage, batchQueue, setBatchQueue, removeFromBatch, addJob, updateJob } = useLibrary()
  const { runReplace } = useBackground({ addJob, updateJob })
  const { runUpscale } = useUpscale({ addJob, updateJob })
  const toast = useToast()
  const navigate = useNavigate()

  const handleContinue = useCallback((job, target) => {
    const chained = {
      id: crypto.randomUUID(),
      name: job.presetName || job.id.slice(0, 8),
      preview: job.result.url,
      outputPath: job.result.outputPath,
      isChained: true,
    }
    setBatchQueue(prev => prev.find(i => i.outputPath === chained.outputPath) ? prev : [...prev, chained])
    navigate(`/${target}`)
  }, [setBatchQueue, navigate])

  const [activeTool, setActiveTool] = useState('presets')
  const [activePreset, setActivePreset] = useState(null)
  const [selectedModel, setSelectedModel] = useState('nano_banana')
  const [processing, setProcessing] = useState(false)
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchStatuses, setBatchStatuses] = useState({})
  const [mobileTab, setMobileTab] = useState('tools')

  // Upscale settings
  const [upscaleMode, setUpscaleMode] = useState('target')
  const [targetMp, setTargetMp] = useState(4)
  const [upscaleFactor, setUpscaleFactor] = useState(2)
  const [enhanceDetails, setEnhanceDetails] = useState(false)
  const [upscaleProcessing, setUpscaleProcessing] = useState(false)
  const [upscaleBatchRunning, setUpscaleBatchRunning] = useState(false)
  const [upscaleBatchStatuses, setUpscaleBatchStatuses] = useState({})

  const handleApply = useCallback(async (preset) => {
    if (!user || !selectedImage || !preset) return
    if (!canUseAction(profile, 'bg_replace')) { navigate('/tokens'); return }

    setProcessing(true)
    let deducted = false
    try {
      await deductTokens(user.id, preset.tokenCost, crypto.randomUUID(), 'bg_replace')
      deducted = true
      await runReplace({ userId: user.id, file: selectedImage.file, preset, model: selectedModel })
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
        const args = img.isChained
          ? { userId: user.id, chainedFrom: img, preset: activePreset, model: selectedModel }
          : { userId: user.id, file: img.file, preset: activePreset, model: selectedModel }
        await runReplace(args)
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

  const upscaleOptions = useCallback(() => ({
    upscaleMode,
    targetMp,
    factor: upscaleFactor,
    enhanceDetails,
  }), [upscaleMode, targetMp, upscaleFactor, enhanceDetails])

  const handleUpscale = useCallback(async () => {
    if (!user || !selectedImage) return
    if (!canUseAction(profile, 'bg_upscale')) { navigate('/tokens'); return }

    setUpscaleProcessing(true)
    let deducted = false
    try {
      await deductTokens(user.id, 1, crypto.randomUUID(), 'bg_upscale')
      deducted = true
      await runUpscale({ userId: user.id, file: selectedImage.file, options: upscaleOptions() })
      setMobileTab('results')
    } catch (err) {
      if (deducted) {
        try { await refundTokens(user.id, 1) } catch {}
      }
      toast.error(err.message || 'Upscale failed')
    } finally {
      setUpscaleProcessing(false)
    }
  }, [user, selectedImage, profile, deductTokens, refundTokens, runUpscale, upscaleOptions, navigate, toast])

  const handleStartUpscaleBatch = useCallback(async () => {
    if (batchQueue.length === 0 || upscaleBatchRunning) return
    if (!canUseAction(profile, 'bg_upscale')) { navigate('/tokens'); return }

    setUpscaleBatchRunning(true)
    setUpscaleBatchStatuses(Object.fromEntries(batchQueue.map(img => [img.id, 'pending'])))

    const opts = upscaleOptions()
    const runItem = async (img) => {
      setUpscaleBatchStatuses(prev => ({ ...prev, [img.id]: 'processing' }))
      let deducted = false
      try {
        await deductTokens(user.id, 1, crypto.randomUUID(), 'bg_upscale')
        deducted = true
        const args = img.isChained
          ? { userId: user.id, chainedFrom: img, options: opts }
          : { userId: user.id, file: img.file, options: opts }
        await runUpscale(args)
        setUpscaleBatchStatuses(prev => ({ ...prev, [img.id]: 'completed' }))
      } catch (err) {
        if (deducted) {
          try { await refundTokens(user.id, 1) } catch {}
        }
        setUpscaleBatchStatuses(prev => ({ ...prev, [img.id]: 'failed' }))
        toast.error(`Failed: ${img.name}`)
      }
    }

    await Promise.allSettled(batchQueue.map(runItem))
    setUpscaleBatchRunning(false)
    toast.success('Batch upscale complete')
    setMobileTab('results')
  }, [batchQueue, upscaleBatchRunning, profile, user, deductTokens, refundTokens, runUpscale, upscaleOptions, navigate, toast])

  return (
    <PanelShell mobileTab={mobileTab} onMobileTabChange={setMobileTab} onContinue={handleContinue}>

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
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
            </>
          )}

          {activeTool === 'upscale' && (
            <UpscalePanel
              selectedImage={selectedImage}
              processing={upscaleProcessing}
              balance={balance}
              onUpscale={handleUpscale}
              batchQueue={batchQueue}
              batchStatuses={upscaleBatchStatuses}
              batchRunning={upscaleBatchRunning}
              onRemoveFromBatch={removeFromBatch}
              onStartBatch={handleStartUpscaleBatch}
              upscaleMode={upscaleMode}
              onUpscaleModeChange={setUpscaleMode}
              targetMp={targetMp}
              onTargetMpChange={setTargetMp}
              factor={upscaleFactor}
              onFactorChange={setUpscaleFactor}
              enhanceDetails={enhanceDetails}
              onEnhanceDetailsChange={setEnhanceDetails}
            />
          )}
        </div>
      </div>

    </PanelShell>
  )
}
