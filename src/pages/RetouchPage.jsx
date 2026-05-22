import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const [batchQueue, setBatchQueue] = useState([])
  const [batchRunning, setBatchRunning] = useState(false)
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

  async function handleDownloadAll() {
    const completed = jobs.filter(j => j.status === 'completed' && j.result?.url)
    for (const job of completed) {
      const a = document.createElement('a')
      a.href = job.result.url
      a.download = `retouched_${job.id.slice(0, 8)}.jpg`
      a.click()
      await new Promise(r => setTimeout(r, 200))
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <LibraryPanel
        images={images}
        selectedImage={selectedImage}
        onSelect={setSelectedImage}
        onUpload={handleUpload}
        batchQueue={batchQueue}
        onAddToBatch={img => setBatchQueue(prev => [...prev, img])}
        onRemoveFromBatch={id => setBatchQueue(prev => prev.filter(i => i.id !== id))}
        onStartBatch={() => {}}
        batchRunning={batchRunning}
      />

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <QuickEnhance
          selectedImage={selectedImage}
          onEnhance={handleQuickEnhance}
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
