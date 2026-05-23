import { supabase } from './supabase'

export async function uploadInput(userId, jobId, file) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${jobId}_original.${ext}`
  const { error } = await supabase.storage.from('inputs').upload(path, file, { upsert: true })
  if (error) throw toStorageError(error)
  return path
}

export async function getInputUrl(path) {
  const { data } = await supabase.storage.from('inputs').createSignedUrl(path, 3600)
  return data?.signedUrl
}

export async function uploadOutputBlob(userId, jobId, blob, ext = 'jpg') {
  const path = `${userId}/${jobId}_result.${ext}`
  const { error } = await supabase.storage.from('outputs').upload(path, blob, {
    contentType: ext === 'zip' ? 'application/zip' : 'image/jpeg',
    upsert: true,
  })
  if (error) throw toStorageError(error)
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

export async function uploadPresetSample(file) {
  const { data: { session } } = await supabase.auth.getSession()
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/admin/upload-sample', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.access_token}` },
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Upload failed')
  return data.url
}
