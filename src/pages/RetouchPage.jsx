import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import JSZip from 'jszip'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useTokens } from '../hooks/useTokens'
import { useRetouch } from '../hooks/useRetouch'
import { canUseAction } from '../lib/access'
import LibraryPanel from '../components/retouch/LibraryPanel'
import QuickEnhance from '../components/retouch/QuickEnhance'
import AdvancedEdit from '../components/retouch/AdvancedEdit'
import ResultsPanel from '../components/retouch/ResultsPanel'

export default function RetouchPage() {
  const { user, profile } = useAuth()
  const { balance, deductTokens, refundTokens } = useTokens()
  const { jobs, runQuickEnhance, runAdvancedEdit, updateJob } = useRetouch()
  const navigate = useNavigate()

  const [images, setImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [activePreset, setActivePreset] = useState(null)
  const [batchQueue, setBatchQueue] = useState([])
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchStatuses, setBatchStatuses] = useState({})
  const [advancedLayers, setAdvancedLayers] = useState(null)
  const [advancedProcessing, setAdvancedProcessing] = useState(false)
  const [activeJobId, setActiveJobId] = useState(null)

  function handleUpload(files) {
    const newImages = files.map(f => ({
      id: crypto.randomUUID(),
      file: f,
      name: f.name,
      preview: URL.createObjectURL(f),
    }))
    setImages(prev => [...prev, ...newImages])
    if (!selectedImage) setSelectedImage(newImages[0])
  }

  const handleQuickEnhance = useCallback(async (preset) => {
    if (!user || !selectedImage) return
    if (!canUseAction(profile, 'quick_enhance')) {
      navigate('/tokens')
      return
    }
    try {
      await deductTokens(user.id, preset.tokenCost, crypto.randomUUID(), 'quick_enhance')
      await runQuickEnhance({ userId: user.id, file: selectedImage.file, preset })
    } catch (err) {
      console.error(err)
    }
  }, [user, selectedImage, profile, deductTokens, runQuickEnhance, navigate])

  const handleAdvancedEdit = useCallback(async ({ plugins, intensityMode }) => {
    if (!user || !selectedImage) return
    if (!canUseAction(profile, 'advanced_edit')) {
      navigate('/tokens')
      return
    }
    setAdvancedProcessing(true)
    setAdvancedLayers(null)
    try {
      await deductTokens(user.id, 2, crypto.randomUUID(), 'advanced_edit')
      const result = await runAdvancedEdit({ userId: user.id, file: selectedImage.file, plugins, intensityMode })
      setAdvancedLayers(result.layers)
      setActiveJobId(result.jobId)
    } catch (err) {
      console.error(err)
    } finally {
      setAdvancedProcessing(false)
    }
  }, [user, selectedImage, profile, deductTokens, runAdvancedEdit, navigate])

  function handleLayerOpacityChange(layerName, opacity) {
    setAdvancedLayers(prev => prev?.map(l => l.name === layerName ? { ...l, opacity } : l))
  }

  async function handleSavePreset({ name, plugins, layers, intensity }) {
    if (!user) return
    const layerOpacities = {}
    layers?.forEach(l => { layerOpacities[l.name] = l.opacity })
    await supabase.from('presets').insert({
      user_id: user.id,
      name,
      panel: 'retouch',
      payload: { mode: 'professional', plugins, intensity },
      layer_opacities: layerOpacities,
    })
  }

  async function handleDownload() {
    const job = jobs.find(j => j.id === activeJobId)
    if (!job?.result?.url) return
    const a = document.createElement('a')
    a.href = job.result.url
    a.download = `retouched_${activeJobId?.slice(0, 8)}.jpg`
    a.click()
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
        console.error('Batch item failed:', img.name, err)
      }
    }

    await Promise.allSettled(batchQueue.map(runItem))
    setBatchRunning(false)
  }, [activePreset, batchQueue, batchRunning, profile, user, deductTokens, refundTokens, runQuickEnhance, navigate])

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
    <div className="flex flex-1 overflow-hidden">
      <LibraryPanel
        images={images}
        selectedImage={selectedImage}
        onSelect={setSelectedImage}
        onUpload={handleUpload}
        batchQueue={batchQueue}
        onAddToBatch={img => setBatchQueue(prev => prev.find(i => i.id === img.id) ? prev : [...prev, img])}
        onRemoveFromBatch={id => setBatchQueue(prev => prev.filter(i => i.id !== id))}
        onStartBatch={handleStartBatch}
        batchRunning={batchRunning}
        batchStatuses={batchStatuses}
        activePreset={activePreset}
      />

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <QuickEnhance
          selectedImage={selectedImage}
          onEnhance={handleQuickEnhance}
          selectedPreset={activePreset}
          onPresetSelect={setActivePreset}
          disabled={advancedProcessing}
          balance={balance}
        />

        <div className="border-t border-[#2a2a2a]" />

        <AdvancedEdit
          selectedImage={selectedImage}
          onStartEditing={handleAdvancedEdit}
          processing={advancedProcessing}
          layers={advancedLayers}
          onLayerOpacityChange={handleLayerOpacityChange}
          onSavePreset={handleSavePreset}
          onDownload={handleDownload}
          balance={balance}
          disabled={false}
        />
      </main>

      <ResultsPanel jobs={jobs} onDownloadAll={handleDownloadAll} />
    </div>
  )
}
