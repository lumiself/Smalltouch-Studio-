import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTokens } from '../hooks/useTokens'
import { useRetouch } from '../hooks/useRetouch'
import { useToast } from '../contexts/ToastContext'
import { useLibrary } from '../contexts/LibraryContext'
import { canUseAction } from '../lib/access'
import { getOutputUrl } from '../lib/storage'
import PanelShell from '../components/shared/PanelShell'
import QuickEnhance from '../components/retouch/QuickEnhance'
import AdvancedEdit from '../components/retouch/AdvancedEdit'
import PlaygroundPanel from '../components/retouch/PlaygroundPanel'

const TOOL_NAV = [
  { id: 'quick-enhance', label: 'Enhance',  Icon: Zap              },
  { id: 'advanced-edit', label: 'Advanced', Icon: SlidersHorizontal },
]

export default function RetouchPage() {
  const { user, profile } = useAuth()
  const { balance, deductTokens, refundTokens } = useTokens()
  const { selectedImage, batchQueue, setBatchQueue, addToBatch, removeFromBatch, jobs, addJob, updateJob } = useLibrary()
  const { runQuickEnhance, runAdvancedEdit, resumeJob } = useRetouch({ addJob, updateJob })
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

  // Tool-only state — no library or results state here
  const [activeTool, setActiveTool] = useState('quick-enhance')
  const [activePreset, setActivePreset] = useState(null)
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchStatuses, setBatchStatuses] = useState({})
  const [advancedProcessing, setAdvancedProcessing] = useState(false)
  const [activeJobId, setActiveJobId] = useState(null)
  const [mobileTab, setMobileTab] = useState('tools')

  const handleQuickEnhance = useCallback(async (preset) => {
    if (!user || !selectedImage) return
    if (!canUseAction(profile, 'quick_enhance')) { navigate('/tokens'); return }
    let deducted = false
    try {
      await deductTokens(user.id, preset.tokenCost, crypto.randomUUID(), 'quick_enhance')
      deducted = true
      await runQuickEnhance({ userId: user.id, file: selectedImage.file, preset })
      setMobileTab('results')
    } catch (err) {
      if (deducted) {
        try {
          await refundTokens(user.id, preset.tokenCost)
          if (err.jobId) updateJob(err.jobId, { tokensRefunded: true })
        } catch {}
      }
      toast.error(err.message || 'Enhancement failed')
    }
  }, [user, selectedImage, profile, deductTokens, refundTokens, runQuickEnhance, updateJob, navigate, toast])

  const handleAdvancedEdit = useCallback(async ({ plugins, intensityMode }) => {
    if (!user || !selectedImage) return
    if (!canUseAction(profile, 'advanced_edit')) { navigate('/tokens'); return }
    setAdvancedProcessing(true)
    let deducted = false
    try {
      await deductTokens(user.id, 2, crypto.randomUUID(), 'advanced_edit')
      deducted = true
      const result = await runAdvancedEdit({ userId: user.id, file: selectedImage.file, plugins, intensityMode })
      setActiveJobId(result.jobId)
    } catch (err) {
      if (deducted) {
        try {
          await refundTokens(user.id, 2)
          if (err.jobId) updateJob(err.jobId, { tokensRefunded: true })
        } catch {}
      }
      toast.error(err.message || 'Advanced edit failed')
    } finally {
      setAdvancedProcessing(false)
    }
  }, [user, selectedImage, profile, deductTokens, refundTokens, runAdvancedEdit, updateJob, navigate, toast])

  async function handleDownloadZip() {
    const job = jobs.find(j => j.id === activeJobId)
    if (!job?.outputPath) return
    try {
      const url = await getOutputUrl(job.outputPath)
      if (!url) throw new Error('Could not get download URL')
      const res = await fetch(url)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      const stem = job.originalFile?.name?.replace(/\.[^.]+$/, '')
      a.download = stem ? `${stem}_retouched.zip` : `retouch_layers_${activeJobId.slice(0, 8)}.zip`
      a.click()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      toast.error(err.message || 'Download failed')
    }
  }

  const handleRetry = useCallback(async (job) => {
    if (!user) return

    // Job was already submitted to Retouch4me — resume polling/download.
    // If tokens were refunded after the initial failure, re-deduct before resuming.
    if (job.externalJobId) {
      const tokenCost = job.type === 'advanced_edit' ? 2 : job.presetData?.tokenCost
      let deducted = false
      if (job.tokensRefunded && tokenCost) {
        if (!canUseAction(profile, job.type)) { navigate('/tokens'); return }
        try {
          await deductTokens(user.id, tokenCost, crypto.randomUUID(), job.type)
          deducted = true
        } catch (err) {
          toast.error(err.message || 'Insufficient tokens')
          return
        }
      }
      try {
        await resumeJob({
          userId: user.id,
          jobId: job.id,
          externalJobId: job.externalJobId,
          isZipJob: job.type === 'advanced_edit',
        })
        setMobileTab('results')
      } catch (err) {
        if (deducted) {
          try { await refundTokens(user.id, tokenCost) } catch {}
        }
        toast.error(err.message || 'Resume failed')
      }
      return
    }

    // Job never got submitted — full resubmit with token deduction
    if (job.type === 'quick_enhance' && job.originalFile && job.presetData) {
      if (!canUseAction(profile, 'quick_enhance')) { navigate('/tokens'); return }
      let deducted = false
      try {
        await deductTokens(user.id, job.presetData.tokenCost, crypto.randomUUID(), 'quick_enhance')
        deducted = true
        await runQuickEnhance({ userId: user.id, file: job.originalFile, preset: job.presetData })
        setMobileTab('results')
      } catch (err) {
        if (deducted) {
          try {
            await refundTokens(user.id, job.presetData.tokenCost)
            if (err.jobId) updateJob(err.jobId, { tokensRefunded: true })
          } catch {}
        }
        toast.error(err.message || 'Retry failed')
      }
    } else if (job.type === 'advanced_edit' && job.originalFile && job.pluginConfig) {
      if (!canUseAction(profile, 'advanced_edit')) { navigate('/tokens'); return }
      setAdvancedProcessing(true)
      let deducted = false
      try {
        await deductTokens(user.id, 2, crypto.randomUUID(), 'advanced_edit')
        deducted = true
        const result = await runAdvancedEdit({ userId: user.id, file: job.originalFile, ...job.pluginConfig })
        setActiveJobId(result.jobId)
      } catch (err) {
        if (deducted) {
          try {
            await refundTokens(user.id, 2)
            if (err.jobId) updateJob(err.jobId, { tokensRefunded: true })
          } catch {}
        }
        toast.error(err.message || 'Retry failed')
      } finally {
        setAdvancedProcessing(false)
      }
    }
  }, [user, profile, resumeJob, deductTokens, refundTokens, runQuickEnhance, runAdvancedEdit, updateJob, navigate, toast])

  const handleStartBatch = useCallback(async () => {
    if (!activePreset || batchQueue.length === 0 || batchRunning) return
    if (!canUseAction(profile, 'batch_retouch')) { navigate('/tokens'); return }

    setBatchRunning(true)
    setBatchStatuses(Object.fromEntries(batchQueue.map(img => [img.id, 'pending'])))

    const runItem = async (img) => {
      setBatchStatuses(prev => ({ ...prev, [img.id]: 'processing' }))
      let deducted = false
      try {
        await deductTokens(user.id, activePreset.tokenCost, crypto.randomUUID(), 'batch_retouch')
        deducted = true
        const args = img.isChained
          ? { userId: user.id, chainedFrom: img, preset: activePreset }
          : { userId: user.id, file: img.file, preset: activePreset }
        await runQuickEnhance(args)
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
  }, [activePreset, batchQueue, batchRunning, profile, user, deductTokens, refundTokens, runQuickEnhance, navigate, toast])

  return (
    <PanelShell mobileTab={mobileTab} onMobileTabChange={setMobileTab} onRetry={handleRetry} onContinue={handleContinue}>

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
          {activeTool === 'quick-enhance' && (
            <QuickEnhance
              selectedPreset={activePreset}
              onPresetSelect={setActivePreset}
            />
          )}
          {activeTool === 'advanced-edit' && (
            <AdvancedEdit
              selectedImage={selectedImage}
              onStartEditing={handleAdvancedEdit}
              processing={advancedProcessing}
              jobComplete={!!activeJobId && jobs.find(j => j.id === activeJobId)?.status === 'completed'}
              onDownloadZip={handleDownloadZip}
              balance={balance}
            />
          )}
          {activeTool === 'quick-enhance' && (
            <PlaygroundPanel
              selectedImage={selectedImage}
              selectedPreset={activePreset}
              batchQueue={batchQueue}
              batchStatuses={batchStatuses}
              batchRunning={batchRunning}
              balance={balance}
              onRemoveFromBatch={removeFromBatch}
              onStartBatch={handleStartBatch}
              onEnhance={handleQuickEnhance}
            />
          )}
        </div>
      </div>

    </PanelShell>
  )
}
