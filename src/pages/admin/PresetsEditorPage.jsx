import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Pencil, Trash2, Check, X, RefreshCw, Loader2, Eye, EyeOff, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { uploadPresetSample } from '../../lib/storage'
import { SkeletonAdminRow } from '../../components/shared/Skeleton'

const PANEL_OPTIONS = [
  { id: 'retouch',    label: 'Retouch Studio' },
  { id: 'background', label: 'Background Studio' },
]

const CATEGORIES_BY_PANEL = {
  retouch:    ['Portrait', 'Beauty', 'Editorial', 'E-commerce', 'Color'],
  background: ['Studio', 'Outdoor', 'Seated', 'Standing', 'Birthday', 'Portrait', 'Group', 'Baby'],
}

function getCategoriesForPanel(panel) {
  return CATEGORIES_BY_PANEL[panel] ?? CATEGORIES_BY_PANEL.retouch
}

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${session.access_token}` }
}

function emptyForm(panel = 'retouch') {
  return {
    preset_key: '',
    panel,
    name: '',
    icon: '✨',
    description: '',
    categories: [],
    token_cost: panel === 'background' ? 2 : 1,
    payload_text: panel === 'background'
      ? 'professional studio background, soft lighting, neutral gray'
      : '{\n  "mode": "professional",\n  "tasks": []\n}',
    before_image_url: '',
    after_image_url: '',
    status: 'active',
    sort_order: 0,
  }
}

export default function PresetsEditorPage() {
  const [presets, setPresets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [creating, setCreating] = useState(false)
  const [activePanel, setActivePanel] = useState('retouch')
  const [newForm, setNewForm] = useState(emptyForm('retouch'))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/admin/presets', { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setPresets(data.presets)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function startEdit(preset) {
    setEditingId(preset.id)
    const panel = preset.panel ?? 'retouch'
    setEditForm({
      preset_key: preset.preset_key,
      panel,
      name: preset.name,
      icon: preset.icon,
      description: preset.description,
      categories: preset.categories ?? [],
      token_cost: preset.token_cost,
      payload_text: panel === 'background'
        ? (preset.payload?.prompt ?? '')
        : JSON.stringify(preset.payload, null, 2),
      before_image_url: preset.before_image_url ?? '',
      after_image_url: preset.after_image_url ?? '',
      status: preset.status,
      sort_order: preset.sort_order,
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
  }

  async function saveEdit(id) {
    setSaving(true)
    setError('')
    try {
      let payload
      if (editForm.panel === 'background') {
        const prompt = editForm.payload_text.trim()
        if (!prompt) throw new Error('Prompt is required')
        payload = { prompt }
      } else {
        try { payload = JSON.parse(editForm.payload_text) } catch { throw new Error('Invalid JSON in payload') }
      }
      const headers = await getAuthHeader()
      const res = await fetch('/api/admin/presets', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editForm.name, icon: editForm.icon, description: editForm.description, categories: editForm.categories, token_cost: Number(editForm.token_cost), payload, before_image_url: editForm.before_image_url || null, after_image_url: editForm.after_image_url || null, status: editForm.status, sort_order: Number(editForm.sort_order), panel: editForm.panel }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setPresets(prev => prev.map(p => p.id === id ? data.preset : p))
      setEditingId(null)
      setEditForm(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveNew() {
    setSaving(true)
    setError('')
    try {
      let payload
      if (newForm.panel === 'background') {
        const prompt = newForm.payload_text.trim()
        if (!prompt) throw new Error('Prompt is required')
        payload = { prompt }
      } else {
        try { payload = JSON.parse(newForm.payload_text) } catch { throw new Error('Invalid JSON in payload') }
      }
      if (!newForm.preset_key.trim() || !newForm.name.trim()) throw new Error('preset_key and name are required')
      const headers = await getAuthHeader()
      const res = await fetch('/api/admin/presets', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_key: newForm.preset_key.trim(), panel: newForm.panel, name: newForm.name, icon: newForm.icon, description: newForm.description, categories: newForm.categories, token_cost: Number(newForm.token_cost), payload, before_image_url: newForm.before_image_url || null, after_image_url: newForm.after_image_url || null, status: newForm.status, sort_order: Number(newForm.sort_order) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Create failed')
      setPresets(prev => [...prev, data.preset])
      setCreating(false)
      setNewForm(emptyForm())
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deletePreset(id) {
    if (!confirm('Delete this preset? This cannot be undone.')) return
    setError('')
    try {
      const headers = await getAuthHeader()
      const res = await fetch(`/api/admin/presets?id=${id}`, { method: 'DELETE', headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setPresets(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  async function toggleStatus(preset) {
    const newStatus = preset.status === 'active' ? 'hidden' : 'active'
    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/admin/presets', {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: preset.id, status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPresets(prev => prev.map(p => p.id === preset.id ? data.preset : p))
    } catch (err) {
      setError(err.message)
    }
  }

  const visiblePresets = presets.filter(p => (p.panel ?? 'retouch') === activePanel)

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[#f5f5f5] text-2xl">Preset Editor</h1>
          <p className="text-[#a3a3a3] text-sm mt-1">Manage presets for all panels</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors p-2">
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => { setCreating(true); setEditingId(null); setNewForm(emptyForm(activePanel)) }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#a855f7] hover:bg-[#7c3aed] text-white text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            New Preset
          </button>
        </div>
      </div>

      {/* Panel filter tabs */}
      <div className="flex gap-1.5">
        {PANEL_OPTIONS.map(p => (
          <button
            key={p.id}
            onClick={() => { setActivePanel(p.id); setCreating(false) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activePanel === p.id
                ? 'bg-[#a855f7] text-white'
                : 'bg-[#242424] text-[#a3a3a3] hover:text-[#f5f5f5]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 px-3 py-2 rounded-lg">{error}</p>}

      {creating && (
        <PresetForm
          form={newForm}
          setForm={setNewForm}
          onSave={saveNew}
          onCancel={() => { setCreating(false); setNewForm(emptyForm(activePanel)) }}
          saving={saving}
          isNew
        />
      )}

      {loading ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full"><tbody>{Array.from({ length: 5 }).map((_, i) => <SkeletonAdminRow key={i} />)}</tbody></table>
        </div>
      ) : visiblePresets.length === 0 && !creating ? (
        <p className="text-[#a3a3a3] text-sm text-center py-12">No {PANEL_OPTIONS.find(p => p.id === activePanel)?.label} presets yet. Click "New Preset" to create one.</p>
      ) : (
        <div className="space-y-2">
          {visiblePresets.map(preset => (
            <div key={preset.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
              {editingId === preset.id ? (
                <div className="p-4">
                  <PresetForm
                    form={editForm}
                    setForm={setEditForm}
                    onSave={() => saveEdit(preset.id)}
                    onCancel={cancelEdit}
                    saving={saving}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0d0d0d] flex items-center justify-center overflow-hidden shrink-0">
                    {preset.after_image_url ? (
                      <img
                        src={preset.after_image_url}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-xl">{preset.icon}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#f5f5f5] text-sm font-medium">{preset.name}</span>
                      <span className="text-[10px] text-[#555] font-mono">{preset.preset_key}</span>
                      {preset.status === 'hidden' && (
                        <span className="text-[10px] text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded">hidden</span>
                      )}
                    </div>
                    <p className="text-[#555] text-xs truncate">{preset.description}</p>
                    <div className="flex gap-1 mt-0.5">
                      {(preset.categories ?? []).map(c => (
                        <span key={c} className="text-[10px] text-[#a3a3a3] bg-[#242424] px-1.5 py-0.5 rounded">{c}</span>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-[#a3a3a3] shrink-0">{preset.token_cost}t</span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => toggleStatus(preset)}
                      title={preset.status === 'active' ? 'Hide preset' : 'Show preset'}
                      className="p-1.5 rounded text-[#555] hover:text-[#a3a3a3] transition-colors"
                    >
                      {preset.status === 'active' ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <button onClick={() => startEdit(preset)} className="p-1.5 rounded text-[#555] hover:text-[#a855f7] transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deletePreset(preset.id)} className="p-1.5 rounded text-[#555] hover:text-[#ef4444] transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PresetForm({ form, setForm, onSave, onCancel, saving, isNew }) {
  const panelCategories = getCategoriesForPanel(form.panel)

  function toggleCategory(cat) {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }))
  }

  function handlePanelChange(panelId) {
    setForm(prev => ({
      ...prev,
      panel: panelId,
      categories: [],
      token_cost: panelId === 'background' ? 2 : 1,
      payload_text: panelId === 'background'
        ? 'professional studio background, soft lighting, neutral gray'
        : '{\n  "mode": "professional",\n  "tasks": []\n}',
    }))
  }

  return (
    <div className="space-y-4 bg-[#0d0d0d] rounded-xl p-4 border border-[#a855f7]/30">
      <h3 className="text-[#f5f5f5] font-medium text-sm">{isNew ? 'New Preset' : 'Edit Preset'}</h3>

      {/* Panel selector */}
      <div>
        <label className="text-[#a3a3a3] text-xs block mb-1.5">Panel</label>
        <div className="flex gap-2">
          {PANEL_OPTIONS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePanelChange(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                form.panel === p.id
                  ? 'bg-[#a855f7] text-white'
                  : 'bg-[#242424] text-[#a3a3a3] hover:text-[#f5f5f5]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {isNew && (
          <div>
            <label className="text-[#a3a3a3] text-xs block mb-1">Key (unique, no spaces)</label>
            <input
              value={form.preset_key}
              onChange={e => setForm(prev => ({ ...prev, preset_key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
              placeholder="natural"
              className="w-full px-3 py-2 bg-[#242424] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-sm font-mono focus:outline-none focus:border-[#a855f7] transition-colors"
            />
          </div>
        )}
        <div>
          <label className="text-[#a3a3a3] text-xs block mb-1">Name</label>
          <input
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Natural"
            className="w-full px-3 py-2 bg-[#242424] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-sm focus:outline-none focus:border-[#a855f7] transition-colors"
          />
        </div>
        <div>
          <label className="text-[#a3a3a3] text-xs block mb-1">Icon (emoji)</label>
          <input
            value={form.icon}
            onChange={e => setForm(prev => ({ ...prev, icon: e.target.value }))}
            placeholder="✨"
            className="w-full px-3 py-2 bg-[#242424] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-sm focus:outline-none focus:border-[#a855f7] transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="text-[#a3a3a3] text-xs block mb-1">Description</label>
        <input
          value={form.description}
          onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="One-line description of what this preset does"
          className="w-full px-3 py-2 bg-[#242424] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-sm focus:outline-none focus:border-[#a855f7] transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[#a3a3a3] text-xs block mb-2">Categories</label>
          <div className="flex flex-wrap gap-1.5">
            {panelCategories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  form.categories.includes(cat)
                    ? 'bg-[#a855f7] text-white'
                    : 'bg-[#242424] text-[#a3a3a3] hover:text-[#f5f5f5]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[#a3a3a3] text-xs block mb-1">Token cost</label>
            <input
              type="number"
              min={1}
              max={10}
              value={form.token_cost}
              onChange={e => setForm(prev => ({ ...prev, token_cost: e.target.value }))}
              className="w-full px-3 py-2 bg-[#242424] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-sm focus:outline-none focus:border-[#a855f7] transition-colors"
            />
          </div>
          <div>
            <label className="text-[#a3a3a3] text-xs block mb-1">Sort order</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={e => setForm(prev => ({ ...prev, sort_order: e.target.value }))}
              className="w-full px-3 py-2 bg-[#242424] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-sm focus:outline-none focus:border-[#a855f7] transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ImageUploadField
          label="Before image"
          value={form.before_image_url}
          onChange={url => setForm(prev => ({ ...prev, before_image_url: url }))}
        />
        <ImageUploadField
          label="After image (also used as the preset card thumbnail)"
          value={form.after_image_url}
          onChange={url => setForm(prev => ({ ...prev, after_image_url: url }))}
        />
      </div>

      <div>
        <label className="text-[#a3a3a3] text-xs block mb-1">Status</label>
        <div className="flex gap-2">
          {['active', 'hidden'].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setForm(prev => ({ ...prev, status: s }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                form.status === s
                  ? 'bg-[#a855f7] text-white'
                  : 'bg-[#242424] text-[#a3a3a3] hover:text-[#f5f5f5]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        {form.panel === 'background' ? (
          <>
            <label className="text-[#a3a3a3] text-xs block mb-1">Prompt</label>
            <textarea
              value={form.payload_text}
              onChange={e => setForm(prev => ({ ...prev, payload_text: e.target.value }))}
              rows={3}
              placeholder="Describe the background, e.g. professional studio, soft lighting, neutral gray"
              className="w-full px-3 py-2 bg-[#242424] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-sm focus:outline-none focus:border-[#a855f7] transition-colors resize-y"
            />
          </>
        ) : (
          <>
            <label className="text-[#a3a3a3] text-xs block mb-1">Payload (JSON)</label>
            <textarea
              value={form.payload_text}
              onChange={e => setForm(prev => ({ ...prev, payload_text: e.target.value }))}
              rows={8}
              className="w-full px-3 py-2 bg-[#242424] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-xs font-mono focus:outline-none focus:border-[#a855f7] transition-colors resize-y"
              spellCheck={false}
            />
          </>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#242424] text-[#a3a3a3] hover:text-[#f5f5f5] text-sm transition-colors"
        >
          <X size={13} />
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#a855f7] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function ImageUploadField({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const url = await uploadPresetSample(file)
      onChange(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <label className="text-[#a3a3a3] text-xs block mb-1">{label}</label>
      <div className="flex gap-2">
        <div className="w-16 h-16 bg-[#0d0d0d] rounded-lg overflow-hidden shrink-0 flex items-center justify-center border border-[#2a2a2a]">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[#555] text-[10px]">No image</span>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex-1 px-2 py-1.5 rounded bg-[#242424] hover:bg-[#2a2a2a] text-[#a3a3a3] hover:text-[#f5f5f5] text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {uploading ? <><Loader2 size={11} className="animate-spin" /> Uploading…</> : <><Upload size={11} /> Upload</>}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="px-2 py-1.5 rounded bg-[#242424] hover:bg-[#ef4444]/20 text-[#a3a3a3] hover:text-[#ef4444] text-xs transition-colors"
                title="Clear"
              >
                <X size={11} />
              </button>
            )}
          </div>
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="…or paste a URL"
            className="w-full px-2 py-1 bg-[#242424] border border-[#2a2a2a] rounded text-[#f5f5f5] text-[10px] font-mono focus:outline-none focus:border-[#a855f7] transition-colors"
          />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>
      {error && <p className="text-[#ef4444] text-[10px] mt-1">{error}</p>}
    </div>
  )
}
