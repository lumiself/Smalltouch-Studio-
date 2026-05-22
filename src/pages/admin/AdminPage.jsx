import { useState, useEffect, useCallback } from 'react'
import { Download, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { packages } from '../../registry/packages'
import { SkeletonAdminRow } from '../../components/shared/Skeleton'

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${session.access_token}` }
}

const TABS = ['Generate', 'Codes', 'Users']

export default function AdminPage() {
  const [tab, setTab] = useState('Generate')

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[#f5f5f5] text-2xl">Admin Dashboard</h1>
        <p className="text-[#a3a3a3] text-sm mt-1">Generate voucher codes, manage users, and review redemptions</p>
      </div>

      <div className="flex gap-1 border-b border-[#2a2a2a]">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'text-[#a855f7] border-[#a855f7]'
                : 'text-[#a3a3a3] border-transparent hover:text-[#f5f5f5]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Generate' && <GenerateTab />}
      {tab === 'Codes' && <CodesTab />}
      {tab === 'Users' && <UsersTab />}
    </div>
  )
}

function GenerateTab() {
  const [packageId, setPackageId] = useState('basic')
  const [quantity, setQuantity] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedCodes, setGeneratedCodes] = useState([])

  const selectedPkg = packages.find(p => p.id === packageId)

  async function handleGenerate(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/tokens/generate', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: Number(quantity), packageId, value: selectedPkg.tokens }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setGeneratedCodes(data.codes)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function downloadCSV() {
    if (!generatedCodes.length) return
    const header = 'Code,Package,Tokens\n'
    const rows = generatedCodes.map(c => `${c},${packageId},${selectedPkg?.tokens}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vouchers_${packageId}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleGenerate} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 space-y-4">
        <h2 className="font-display font-semibold text-[#f5f5f5] text-base">Generate Voucher Codes</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[#a3a3a3] text-xs block mb-1.5">Package</label>
            <select
              value={packageId}
              onChange={e => setPackageId(e.target.value)}
              className="w-full px-3 py-2 bg-[#242424] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-sm focus:outline-none focus:border-[#a855f7] transition-colors"
            >
              {packages.map(p => (
                <option key={p.id} value={p.id}>{p.icon} {p.name} — {p.tokens} tokens · {p.price}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[#a3a3a3] text-xs block mb-1.5">Quantity (max 500)</label>
            <input
              type="number"
              min={1}
              max={500}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Math.min(500, Number(e.target.value))))}
              className="w-full px-3 py-2 bg-[#242424] border border-[#2a2a2a] rounded-lg text-[#f5f5f5] text-sm focus:outline-none focus:border-[#a855f7] transition-colors"
            />
          </div>
        </div>

        {selectedPkg && (
          <div className="bg-[#242424] rounded-lg px-3 py-2 text-xs text-[#a3a3a3]">
            Each code adds <span className="text-[#f5f5f5] font-semibold">{selectedPkg.tokens} tokens</span> and upgrades the user to <span className="text-[#f5f5f5] font-semibold">{selectedPkg.name}</span> if their current tier is lower.
          </div>
        )}

        {error && <p className="text-[#ef4444] text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#a855f7] hover:bg-[#7c3aed] disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          {loading ? 'Generating...' : `Generate ${quantity} Code${quantity > 1 ? 's' : ''}`}
        </button>
      </form>

      {generatedCodes.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-[#f5f5f5] text-base">
              {generatedCodes.length} codes generated
            </h2>
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#2a2a2a] text-[#a3a3a3] hover:text-[#f5f5f5] text-xs font-medium transition-colors border border-[#3a3a3a]"
            >
              <Download size={13} />
              Download CSV
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {generatedCodes.map(code => (
              <div key={code} className="font-mono text-sm text-[#f5f5f5] bg-[#242424] rounded px-3 py-1.5 tracking-wider">
                {code}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function CodesTab() {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const headers = await getAuthHeader()
      const params = filter === 'all' ? '' : `?used=${filter === 'used'}`
      const res = await fetch(`/api/admin/codes${params}`, { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setCodes(data.codes)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  function downloadCSV() {
    const header = 'Code,Package,Tokens,Used,Used At\n'
    const rows = codes.map(c =>
      `${c.code},${c.package_id},${c.value},${c.is_used ? 'yes' : 'no'},${c.used_at ?? ''}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vouchers_all_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {['all', 'unused', 'used'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                filter === f ? 'bg-[#a855f7] text-white' : 'bg-[#242424] text-[#a3a3a3] hover:text-[#f5f5f5]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
            <RefreshCw size={14} />
          </button>
          {codes.length > 0 && (
            <button
              onClick={downloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#2a2a2a] text-[#a3a3a3] hover:text-[#f5f5f5] text-xs font-medium transition-colors border border-[#3a3a3a]"
            >
              <Download size={13} />
              CSV
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-[#ef4444] text-sm">{error}</p>}

      {loading ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody>{Array.from({ length: 8 }).map((_, i) => <SkeletonAdminRow key={i} />)}</tbody>
          </table>
        </div>
      ) : codes.length === 0 ? (
        <p className="text-[#a3a3a3] text-sm text-center py-8">No codes found</p>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left text-xs text-[#a3a3a3] font-medium px-4 py-3">Code</th>
                <th className="text-left text-xs text-[#a3a3a3] font-medium px-4 py-3">Package</th>
                <th className="text-left text-xs text-[#a3a3a3] font-medium px-4 py-3">Tokens</th>
                <th className="text-left text-xs text-[#a3a3a3] font-medium px-4 py-3">Status</th>
                <th className="text-left text-xs text-[#a3a3a3] font-medium px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {codes.map(c => {
                const pkg = packages.find(p => p.id === c.package_id)
                return (
                  <tr key={c.id} className="border-b border-[#2a2a2a]/50 hover:bg-[#242424]/50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-[#f5f5f5] tracking-wider">{c.code}</td>
                    <td className="px-4 py-2.5 text-xs text-[#a3a3a3]">
                      {pkg ? `${pkg.icon} ${pkg.name}` : c.package_id}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#f5f5f5]">{c.value}</td>
                    <td className="px-4 py-2.5">
                      {c.is_used ? (
                        <span className="flex items-center gap-1 text-xs text-[#ef4444]">
                          <XCircle size={12} /> Used
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-[#22c55e]">
                          <CheckCircle size={12} /> Available
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#555]">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/admin/users', { headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setUsers(data.users)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handlePackageChange(userId, newPackageId) {
    setUpdating(userId)
    try {
      const headers = await getAuthHeader()
      const res = await fetch('/api/admin/update-package', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, packageId: newPackageId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, package_id: newPackageId } : u))
    } catch (err) {
      setError(err.message)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[#a3a3a3] text-sm">{users.length} users</p>
        <button onClick={load} className="text-[#a3a3a3] hover:text-[#f5f5f5] transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {error && <p className="text-[#ef4444] text-sm">{error}</p>}

      {loading ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody>{Array.from({ length: 6 }).map((_, i) => <SkeletonAdminRow key={i} />)}</tbody>
          </table>
        </div>
      ) : users.length === 0 ? (
        <p className="text-[#a3a3a3] text-sm text-center py-8">No users found</p>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left text-xs text-[#a3a3a3] font-medium px-4 py-3">Email</th>
                <th className="text-left text-xs text-[#a3a3a3] font-medium px-4 py-3">Tokens</th>
                <th className="text-left text-xs text-[#a3a3a3] font-medium px-4 py-3">Package</th>
                <th className="text-left text-xs text-[#a3a3a3] font-medium px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const pkg = packages.find(p => p.id === u.package_id)
                return (
                  <tr key={u.id} className="border-b border-[#2a2a2a]/50 hover:bg-[#242424]/50 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-[#f5f5f5] max-w-[200px] truncate">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-semibold" style={{ color: pkg?.color ?? '#a3a3a3' }}>
                        {u.token_balance ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <select
                          value={u.package_id ?? ''}
                          onChange={e => handlePackageChange(u.id, e.target.value)}
                          disabled={updating === u.id}
                          className="bg-[#242424] border border-[#3a3a3a] rounded px-2 py-1 text-xs text-[#f5f5f5] focus:outline-none focus:border-[#a855f7] transition-colors disabled:opacity-50"
                        >
                          <option value="">— none —</option>
                          {packages.map(p => (
                            <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                          ))}
                        </select>
                        {updating === u.id && <Loader2 size={12} className="animate-spin text-[#a855f7]" />}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[#555]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
