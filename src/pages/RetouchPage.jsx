import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, SlidersHorizontal } from 'lucide-react'
import JSZip from 'jszip'
import { useAuth } from '../hooks/useAuth'
import { useTokens } from '../hooks/useTokens'
import { useRetouch } from '../hooks/useRetouch'
import { useToast } from '../contexts/ToastContext'
import { canUseAction } from '../lib/access'
import { saveUpload, loadUpload, clearUpload } from '../lib/uploadStore'
import { getOutputUrl } from '../lib/storage'
import LibraryPanel from '../components/retouch/LibraryPanel'
import QuickEnhance from '../components/retouch/QuickEnhance'
import AdvancedEdit from '../components/retouch/AdvancedEdit'
import ResultsPanel from '../components/retouch/ResultsPanel'
import PlaygroundPanel from '../components/retouch/PlaygroundPanel'

const MOBILE_TABS = [
  { id: 'library', label: 'Library' },
  { id: 'tools',   label: 'Tools'   },
  { id: 'results', label: 'Results' },
]

const TOOL_NAV = [
  { id: 'quick-enhance',  label: 'Enhance',  Icon: Zap              },
  { id: 'advanced-edit',  label: 'Advanced', Icon: SlidersHorizontal },
]

export default function RetouchPage() {
  const { user, profile } = useAuth()
  const { balance, deductTokens, refundTokens } = useTokens()
  const { jobs, runQuickEnhance, runAdvancedEdit } = useRetouch()
  const toast = useToast()
  const navigate = useNavigate()

  const [images, setImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [activePreset, setActivePreset] = useState(null)
  const [batchQueue, setBatchQueue] = useState([])
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchStatuses, setBatchStatuses] = useState({})
  const [advancedProcessing, setAdvancedProcessing] = useState(false)
  const [activeJobId, setActiveJobId] = useState(null)
  const [mobileTab, setMobileTab] = useState('tools')
  const [activeTool, setActiveTool] = useState('quick-enhance')
  const [restored, setRestored] = useState(false)

  const storeKey = user ? `retouch:${user.id}` : null

  useEffect(() => {
    if (!storeKey) return
    let cancelled = false
    loadUpload(storeKey).then(stored => {
      if (cancelled || !Array.isArray(stored) || stored.length === 0) {
        setRestored(true)
        return
      }
      const rehydrated = stored.map(item => ({
        id: item.id,
        file: item.file,
        name: item.name,
        preview: URL.createObjectURL(item.file),
      }))
      setImages(rehydrated)
      setSelectedImage(prev => prev ?? rehydrated[0])
      setRestored(true)
    }).catch(() => setRestored(true))
    return () => { cancelled = true }
  }, [storeKey])

  useEffect(() => {
    if (!storeKey || !restored) return
    if (images.length === 0) {
      clearUpload(storeKey).catch(() => {})
    } else {
      saveUpload(storeKey, images.map(({ id, file, name }) => ({ id, file, name }))).catch(() => {})
    }
  }, [images, storeKey, restored])

  function handleUpload(files) {
    const newImages = files.map(f => ({
      id: crypto.randomUUID(),
      file: f,
      name: f.name,
      preview: URL.createObjectURL(f),
    }))
    setImages(prev => [...prev, ...newImages])
    if (!selectedImage) setSelectedImage(newImages[0])
    if (newImages.length) setMobileTab('tools')
  }

  const handleQuickEnhance = useCallback(async (preset) => {
    if (!user || !selectedImage) return
    if (!canUseAction(profile, 'quick_enhance')) { navigate('/tokens'); return }
    try {
      await deductTokens(user.id, preset.tokenCost, crypto.randomUUID(), 'quick_enhance')
      await runQuickEnhance({ userId: user.id, file: selectedImage.file, preset })
      setMobileTab('results')
    } catch (err) {
      toast.error(err.message || 'Enhancement failed')
    }
  }, [user, selectedImage, profile, deductTokens, runQuickEnhance, navigate, toast])

  const handleAdvancedEdit = useCallback(async ({ plugins, intensityMode }) => {
    if (!user || !selectedImage) return
    if (!canUseAction(profile, 'advanced_edit')) { navigate('/tokens'); return }
    setAdvancedProcessing(true)
    try {
      await deductTokens(user.id, 2, crypto.randomUUID(), 'advanced_edit')
      const result = await runAdvancedEdit({ userId: user.id, file: selectedImage.file, plugins, intensityMode })
      setActiveJobId(result.jobId)
    } catch (err) {
      toast.error(err.message || 'Advanced edit failed')
    } finally {
      setAdvancedProcessing(false)
    }
  }, [user, selectedImage, profile, deductTokens, runAdvancedEdit, navigate, toast])

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
      a.download = `retouch_layers_${activeJobId.slice(0, 8)}.zip`
      a.click()
      URL.revokeObjectURL(objectUrl)
    } catch (err) {
      toast.error(err.message || 'Download failed')
    }
  }

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
        await runQuickEnhance({ userId: user.id, file: img.file, preset: activePreset })
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

  async function handleDownloadAll() {
    const completed = jobs.filter(j => j.status === 'completed' && j.result?.url)
    if (!completed.length) return

    const zip = new JSZip()
    await Promise.all(completed.map(async (job, i) => {
      try {
        const res = await fetch(job.result.url)
        const blob = await res.blob()
        const ext = blob.type.includes('png') ? 'png' : 'jpg'
        const label = job.presetName
          ? `${job.presetName.replace(/\s+/g, '_')}_${i + 1}.${ext}`
          : `retouched_${i + 1}.${ext}`
        zip.file(label, blob)
      } catch {}
    }))

    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = 'smalltouch_results.zip'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">

      {/* Mobile top tabs: Library / Tools / Results */}
      <div className="md:hidden flex border-b border-[#2a2a2a] shrink-0 bg-[#1a1a1a]">
        {MOBILE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setMobileTab(tab.id)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
              mobileTab === tab.id
                ? 'text-[#a855f7] border-[#a855f7]'
                : 'text-[#555] border-transparent hover:text-[#a3a3a3]'
            }`}
          >
            {tab.label}
            {tab.id === 'results' && jobs.length > 0 && (
              <span className="ml-1 text-[9px] bg-[#a855f7]/20 text-[#a855f7] px-1 rounded-full">
                {jobs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Library ── */}
        <div className={`${mobileTab === 'library' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[220px] shrink-0 border-r border-[#2a2a2a] overflow-hidden`}>
          <LibraryPanel
            images={images}
            selectedImage={selectedImage}
            onSelect={img => { setSelectedImage(img); setActiveJobId(null); setMobileTab('tools') }}
            onUpload={handleUpload}
            batchQueue={batchQueue}
            onAddToBatch={img => setBatchQueue(prev => prev.find(i => i.id === img.id) ? prev : [...prev, img])}
          />
        </div>

        {/* ── Center: tool nav + tool content + playground ── */}
        <div className={`${mobileTab === 'tools' ? 'flex' : 'hidden'} md:flex flex-1 flex-col overflow-hidden min-h-0`}>

          {/* Mobile-only horizontal tool switcher */}
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

          {/* Tool area */}
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* Vertical nav — desktop only */}
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

            {/* Active tool content + playground scrolling together */}
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
                  onRemoveFromBatch={id => setBatchQueue(prev => prev.filter(i => i.id !== id))}
                  onStartBatch={handleStartBatch}
                  onEnhance={handleQuickEnhance}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Results ── */}
        <div className={`${mobileTab === 'results' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[260px] shrink-0 border-l border-[#2a2a2a] overflow-hidden`}>
          <ResultsPanel
            jobs={jobs.filter(j => j.type !== 'advanced_edit')}
            onDownloadAll={handleDownloadAll}
          />
        </div>

      </div>
    </div>
  )
}
