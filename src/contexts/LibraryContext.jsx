import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { saveUpload, loadUpload, clearUpload } from '../lib/uploadStore'

const LibraryContext = createContext(null)

export function LibraryProvider({ children }) {
  const { user } = useAuth()
  const [images, setImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [batchQueue, setBatchQueue] = useState([])
  const [jobs, setJobs] = useState([])
  const [restored, setRestored] = useState(false)

  const storeKey = user ? `library:${user.id}` : null

  // Restore images from IndexedDB on mount
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

  // Persist images to IndexedDB whenever they change
  useEffect(() => {
    if (!storeKey || !restored) return
    if (images.length === 0) {
      clearUpload(storeKey).catch(() => {})
    } else {
      saveUpload(storeKey, images.map(({ id, file, name }) => ({ id, file, name }))).catch(() => {})
    }
  }, [images, storeKey, restored])

  const addImages = useCallback((files) => {
    const newImages = files.map(f => ({
      id: crypto.randomUUID(),
      file: f,
      name: f.name,
      preview: URL.createObjectURL(f),
    }))
    setImages(prev => [...prev, ...newImages])
    setSelectedImage(prev => prev ?? newImages[0])
  }, [])

  const addToBatch = useCallback((img) => {
    setBatchQueue(prev => prev.find(i => i.id === img.id) ? prev : [...prev, img])
  }, [])

  const removeFromBatch = useCallback((id) => {
    setBatchQueue(prev => prev.filter(i => i.id !== id))
  }, [])

  const addJob = useCallback((job) => {
    setJobs(prev => [...prev, job])
  }, [])

  const updateJob = useCallback((id, patch) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j))
  }, [])

  return (
    <LibraryContext.Provider value={{
      images, selectedImage, setSelectedImage, addImages,
      batchQueue, setBatchQueue, addToBatch, removeFromBatch,
      jobs, addJob, updateJob,
    }}>
      {children}
    </LibraryContext.Provider>
  )
}

export function useLibrary() {
  const ctx = useContext(LibraryContext)
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
  return ctx
}
