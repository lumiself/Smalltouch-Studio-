import { supabase } from './supabase'

const STORAGE_RETRY_DELAYS = [2000, 4000, 8000]

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function dispatchRetry(name, success) {
  window.dispatchEvent(new CustomEvent(name, { detail: { success } }))
}

async function retryStorage(fn) {
  let lastErr
  let didRetry = false
  for (let attempt = 0; attempt <= STORAGE_RETRY_DELAYS.length; attempt++) {
    const { error } = await fn()
    if (!error) {
      if (didRetry) dispatchRetry('network-retry-done', true)
      return
    }
    // Don't retry on permission / RLS errors
    const msg = error.message?.toLowerCase() ?? ''
    const isPermErr = msg.includes('row level security') || msg.includes('not authorized') ||
      (error.statusCode >= 400 && error.statusCode < 500)
    if (isPermErr) throw toStorageError(error)
    lastErr = error
    if (attempt < STORAGE_RETRY_DELAYS.length) {
      if (!didRetry) dispatchRetry('network-retrying')
      didRetry = true
      await sleep(STORAGE_RETRY_DELAYS[attempt])
    }
  }
  if (didRetry) dispatchRetry('network-retry-done', false)
  throw toStorageError(lastErr)
}

export async function uploadInput(userId, jobId, file) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${jobId}_original.${ext}`
  await retryStorage(() => supabase.storage.from('inputs').upload(path, file, { upsert: true }))
  return path
}

export async function getInputUrl(path) {
  const { data } = await supabase.storage.from('inputs').createSignedUrl(path, 3600)
  return data?.signedUrl
}

export async function uploadOutputBlob(userId, jobId, blob, ext = 'jpg') {
  const path = `${userId}/${jobId}_result.${ext}`
  await retryStorage(() => supabase.storage.from('outputs').upload(path, blob, {
    contentType: ext === 'zip' ? 'application/zip' : 'image/jpeg',
    upsert: true,
  }))
  return path
}

function toStorageError(err) {
  if (err?.message?.toLowerCase().includes('row level security')) {
    return new Error('Storage access not configured — run the storage RLS policies from docs/supabase-schema.sql in your Supabase SQL editor.')
  }
  return err
}

export async function getOutputUrl(path) {
  const { data } = await supabase.storage.from('outputs').createSignedUrl(path, 3600)
  return data?.signedUrl
}

export async function deleteInput(path) {
  const { error } = await supabase.storage.from('inputs').remove([path])
  if (error) throw error
}

// Resizes an image file to fit within maxPx on its longest edge, returning a JPEG blob.
// Keeps preset sample uploads well under Vercel's 4.5 MB serverless body limit.
function resizeImage(file, maxPx = 1200, quality = 0.85) {
  return new Promise(resolve => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob(blob => resolve(blob ?? file), 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file) }
    img.src = blobUrl
  })
}

export async function uploadPresetSample(file) {
  const resized = await resizeImage(file)
  const { data: { session } } = await supabase.auth.getSession()
  const formData = new FormData()
  formData.append('file', new File([resized], 'sample.jpg', { type: 'image/jpeg' }))
  const res = await fetch('/api/admin/upload-sample', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.access_token}` },
    body: formData,
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { error: text.trim().slice(0, 200) } }
  if (!res.ok) throw new Error(data.error || 'Upload failed')
  return data.url
}
