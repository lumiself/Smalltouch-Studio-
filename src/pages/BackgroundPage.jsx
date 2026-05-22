import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useTokens } from '../hooks/useTokens'
import { useBackground } from '../hooks/useBackground'
import { canUseAction } from '../lib/access'
import { uploadInput } from '../lib/storage'
import BackgroundTools from '../components/background/BackgroundTools'
import CanvasPreview from '../components/background/CanvasPreview'

export default function BackgroundPage() {
  const { user, profile } = useAuth()
  const { balance, deductTokens, refundTokens } = useTokens()
  const { pollBgStatus } = useBackground()
  const navigate = useNavigate()
  const downloadRef = useRef(null)

  const [file, setFile] = useState(null)
  const [originalUrl, setOriginalUrl] = useState(null)
  const [inputPath, setInputPath] = useState(null)
  const [subjectUrl, setSubjectUrl] = useState(null)
  const [step, setStep] = useState('idle')

  const [activeTool, setActiveTool] = useState('replace')
  const [bgType, setBgType] = useState('transparent')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [gradientStart, setGradientStart] = useState('#667eea')
  const [gradientEnd, setGradientEnd] = useState('#764ba2')
  const [gradientAngle, setGradientAngle] = useState(135)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiBgUrl, setAiBgUrl] = useState(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [blurAmount, setBlurAmount] = useState(8)
  const [expandPrompt, setExpandPrompt] = useState('')
  const [expandPadding, setExpandPadding] = useState(150)
  const [expandResult, setExpandResult] = useState(null)
  const [expanding, setExpanding] = useState(false)
  const [stockBgUrl, setStockBgUrl] = useState(null)
  const [removing, setRemoving] = useState(false)

  const handleUpload = useCallback(async (uploadedFile) => {
    const url = URL.createObjectURL(uploadedFile)
    setFile(uploadedFile)
    setOriginalUrl(url)
    setSubjectUrl(null)
    setExpandResult(null)
    setAiBgUrl(null)
    setStep('uploading')

    try {
      const jobId = crypto.randomUUID()
      const path = await uploadInput(user.id, jobId, uploadedFile)
      setInputPath(path)
      setStep('uploaded')
    } catch (err) {
      console.error('Upload failed:', err)
      setStep('idle')
    }
  }, [user])

  const handleRemoveBg = useCallback(async () => {
    if (!inputPath || !user) return
    if (!canUseAction(profile, 'bg_remove')) {
      navigate('/tokens')
      return
    }

    const jobId = crypto.randomUUID()
    let deducted = false
    setRemoving(true)
    setStep('removing')

    try {
      await deductTokens(user.id, 1, jobId, 'bg_remove')
      deducted = true

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/background/remove', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputPath, userId: user.id }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start removal')

      const output = await pollBgStatus(data.predictionId, jobId, null)
      setSubjectUrl(output)
      setStep('removed')
    } catch (err) {
      if (deducted) {
        try { await refundTokens(user.id, 1) } catch {}
      }
      setStep('uploaded')
      console.error('Remove BG failed:', err)
    } finally {
      setRemoving(false)
    }
  }, [inputPath, user, profile, deductTokens, refundTokens, pollBgStatus, navigate])

  const handleAiGenerate = useCallback(async () => {
    if (!aiPrompt.trim() || !user) return
    if (!canUseAction(profile, 'bg_ai_generate')) {
      navigate('/tokens')
      return
    }

    const jobId = crypto.randomUUID()
    let deducted = false
    setAiGenerating(true)

    try {
      await deductTokens(user.id, 2, jobId, 'bg_ai_generate')
      deducted = true

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/background/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: aiPrompt, width: 1024, height: 1024 }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start generation')

      const output = await pollBgStatus(data.predictionId, jobId, null)
      setAiBgUrl(output)
      setBgType('ai')
    } catch (err) {
      if (deducted) {
        try { await refundTokens(user.id, 2) } catch {}
      }
      console.error('AI generate failed:', err)
    } finally {
      setAiGenerating(false)
    }
  }, [aiPrompt, user, profile, deductTokens, refundTokens, pollBgStatus, navigate])

  const handleApply = useCallback(async (type) => {
    if (!subjectUrl || !user) return

    const actionMap = {
      solid: { action: 'bg_replace_solid', tokens: 1 },
      gradient: { action: 'bg_replace_solid', tokens: 1 },
      transparent: { action: 'bg_replace_solid', tokens: 1 },
      stock: { action: 'bg_replace_solid', tokens: 1 },
      blur: { action: 'bg_blur', tokens: 1 },
    }

    const config = actionMap[type]
    if (!config) return
    if (!canUseAction(profile, config.action)) {
      navigate('/tokens')
      return
    }

    const jobId = crypto.randomUUID()
    let deducted = false

    try {
      await deductTokens(user.id, config.tokens, jobId, config.action)
      deducted = true
      setBgType(type)
    } catch (err) {
      if (deducted) {
        try { await refundTokens(user.id, config.tokens) } catch {}
      }
      console.error('Apply failed:', err)
    }
  }, [subjectUrl, user, profile, deductTokens, refundTokens, navigate])

  const handleExpand = useCallback(async () => {
    if (!subjectUrl || !user || !expandPrompt.trim()) return
    if (!canUseAction(profile, 'bg_expand')) {
      navigate('/tokens')
      return
    }

    const jobId = crypto.randomUUID()
    let deducted = false
    setExpanding(true)

    try {
      await deductTokens(user.id, 2, jobId, 'bg_expand')
      deducted = true

      const { imageDataUri, maskDataUri } = await buildExpandDataUris(subjectUrl, expandPadding)

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/background/expand', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageDataUri, maskDataUri, prompt: expandPrompt }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start expand')

      const output = await pollBgStatus(data.predictionId, jobId, null)
      setExpandResult(output)
    } catch (err) {
      if (deducted) {
        try { await refundTokens(user.id, 2) } catch {}
      }
      console.error('Expand failed:', err)
    } finally {
      setExpanding(false)
    }
  }, [subjectUrl, user, profile, expandPadding, expandPrompt, deductTokens, refundTokens, pollBgStatus, navigate])

  const handleDownload = useCallback(() => {
    if (downloadRef.current) {
      downloadRef.current()
    }
  }, [])

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-[280px] flex-shrink-0 border-r border-[#2a2a2a] overflow-y-auto">
        <BackgroundTools
          file={file}
          originalUrl={originalUrl}
          step={step}
          removing={removing}
          subjectUrl={subjectUrl}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          bgType={bgType}
          onBgTypeChange={setBgType}
          bgColor={bgColor}
          onBgColorChange={setBgColor}
          gradientStart={gradientStart}
          onGradientStartChange={setGradientStart}
          gradientEnd={gradientEnd}
          onGradientEndChange={setGradientEnd}
          gradientAngle={gradientAngle}
          onGradientAngleChange={setGradientAngle}
          aiPrompt={aiPrompt}
          onAiPromptChange={setAiPrompt}
          aiGenerating={aiGenerating}
          onAiGenerate={handleAiGenerate}
          aiBgUrl={aiBgUrl}
          blurAmount={blurAmount}
          onBlurAmountChange={setBlurAmount}
          expandPrompt={expandPrompt}
          onExpandPromptChange={setExpandPrompt}
          expandPadding={expandPadding}
          onExpandPaddingChange={setExpandPadding}
          expanding={expanding}
          onExpand={handleExpand}
          stockBgUrl={stockBgUrl}
          onStockBgSelect={setStockBgUrl}
          onUpload={handleUpload}
          onRemoveBg={handleRemoveBg}
          onApply={handleApply}
          onDownload={handleDownload}
          balance={balance}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        <CanvasPreview
          originalUrl={originalUrl}
          subjectUrl={subjectUrl}
          bgType={bgType}
          bgColor={bgColor}
          gradientStart={gradientStart}
          gradientEnd={gradientEnd}
          gradientAngle={gradientAngle}
          blurAmount={blurAmount}
          aiBgUrl={aiBgUrl}
          stockBgUrl={stockBgUrl}
          expandResult={expandResult}
          onDownloadReady={(fn) => { downloadRef.current = fn }}
        />
      </div>
    </div>
  )
}

async function buildExpandDataUris(subjectUrl, padding) {
  const img = await loadImage(subjectUrl)
  const TARGET = 512
  const origW = img.naturalWidth
  const origH = img.naturalHeight
  const paddedW = origW + padding * 2
  const paddedH = origH + padding * 2
  const scale = Math.min(TARGET / paddedW, TARGET / paddedH, 1)
  const outW = Math.round(paddedW * scale)
  const outH = Math.round(paddedH * scale)
  const subjectX = Math.round(padding * scale)
  const subjectY = Math.round(padding * scale)
  const subjectDrawW = Math.round(origW * scale)
  const subjectDrawH = Math.round(origH * scale)

  const imageCanvas = document.createElement('canvas')
  imageCanvas.width = outW
  imageCanvas.height = outH
  const ctx = imageCanvas.getContext('2d')
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, outW, outH)
  ctx.drawImage(img, subjectX, subjectY, subjectDrawW, subjectDrawH)
  const imageDataUri = imageCanvas.toDataURL('image/png')

  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = outW
  maskCanvas.height = outH
  const mctx = maskCanvas.getContext('2d')
  mctx.fillStyle = '#ffffff'
  mctx.fillRect(0, 0, outW, outH)
  mctx.fillStyle = '#000000'
  mctx.fillRect(subjectX, subjectY, subjectDrawW, subjectDrawH)
  const maskDataUri = maskCanvas.toDataURL('image/png')

  return { imageDataUri, maskDataUri }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
