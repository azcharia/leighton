// src/App.tsx
import { useEffect, useState, useCallback } from 'react'
import { Download, RefreshCw, AlertCircle } from 'lucide-react'
import { supabase, type Defect } from './lib/supabase'
import { DefectModal } from './components/DefectModal'

// ── Priority badge colours ─────────────────────────────────────────────────
const priorityClasses: Record<string, string> = {
  Low:      'bg-green-100  text-green-800',
  Medium:   'bg-yellow-100 text-yellow-800',
  High:     'bg-orange-100 text-orange-800',
  Critical: 'bg-red-100    text-red-800',
}

// ── Status badge colours ───────────────────────────────────────────────────
const statusClasses: Record<string, string> = {
  'Pending AI': 'bg-gray-200   text-gray-700',
  'Processed':  'bg-blue-100   text-blue-800',
  'Resolved':   'bg-green-100  text-green-800',
}

export default function App() {
  const [defects, setDefects]       = useState<Defect[]>([])
  const [selected, setSelected]     = useState<Defect | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  // ── Initial fetch ──────────────────────────────────────────────────────
  const fetchDefects = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('defects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setDefects(data as Defect[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDefects()
  }, [fetchDefects])

  // ── Realtime subscription ──────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('defects-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'defects' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDefects((prev) => [payload.new as Defect, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setDefects((prev) =>
              prev.map((d) =>
                d.id === (payload.new as Defect).id
                  ? (payload.new as Defect)
                  : d
              )
            )
            // Keep the modal in sync if it's open on the updated row
            setSelected((prev) =>
              prev?.id === (payload.new as Defect).id
                ? (payload.new as Defect)
                : prev
            )
          } else if (payload.eventType === 'DELETE') {
            setDefects((prev) => prev.filter((d) => d.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // ── Export to CSV (opens natively in Excel) ───────────────────────────
  const exportToExcel = () => {
    const headers = [
      'ID', 'Created At', 'Defect Type', 'Priority',
      'Responsible Trade', 'Suggested Action', 'Status',
      'Transcript', 'Image URL',
    ]
    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const rows = defects.map((d) => [
      d.id,
      new Date(d.created_at).toLocaleString(),
      d.defect_type ?? '-',
      d.priority ?? '-',
      d.responsible_trade ?? '-',
      d.suggested_action ?? '-',
      d.status,
      d.audio_transcript,
      d.image_url,
    ].map(escape).join(','))

    const csv = [headers.map(escape).join(','), ...rows].join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leighton-punchlist-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Handle modal save ──────────────────────────────────────────────────
  const handleSave = async (updated: Defect) => {
    const { error } = await supabase
      .from('defects')
      .update({
        defect_type:       updated.defect_type,
        priority:          updated.priority,
        responsible_trade: updated.responsible_trade,
        suggested_action:  updated.suggested_action,
        status:            updated.status,
      })
      .eq('id', updated.id)

    if (error) {
      alert(`Save failed: ${error.message}`)
      return
    }
    // Realtime will update the list; just close modal
    setSelected(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#003A8C] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Leighton Asia — AI Punchlist
            </h1>
            <p className="text-blue-200 text-sm mt-0.5">QA Dashboard</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchDefects}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition px-4 py-2 rounded-lg text-sm font-medium"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 transition px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Download size={16} />
              Export Excel
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary pills */}
        <div className="flex flex-wrap gap-3 mb-6">
          {(['Pending AI', 'Processed', 'Resolved'] as const).map((s) => (
            <div
              key={s}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${statusClasses[s]}`}
            >
              {s}:{' '}
              <strong>{defects.filter((d) => d.status === s).length}</strong>
            </div>
          ))}
          <div className="px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
            Total: <strong>{defects.length}</strong>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#003A8C]" />
          </div>
        ) : defects.length === 0 ? (
          <div className="text-center text-gray-400 py-24">
            <p className="text-lg">No defects logged yet.</p>
            <p className="text-sm mt-1">
              Capture one from the mobile app to get started.
            </p>
          </div>
        ) : (
          /* Data table */
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    '#',
                    'Date / Time',
                    'Thumbnail',
                    'Defect Type',
                    'Priority',
                    'Trade',
                    'Status',
                    '',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {defects.map((defect, idx) => (
                  <tr
                    key={defect.id}
                    className="hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => setSelected(defect)}
                  >
                    <td className="px-4 py-3 text-gray-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {new Date(defect.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <img
                        src={defect.image_url}
                        alt="defect"
                        className="h-12 w-16 object-cover rounded-md border border-gray-200"
                        loading="lazy"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {defect.defect_type ?? (
                        <span className="text-gray-400 italic">
                          Classifying…
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {defect.priority ? (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            priorityClasses[defect.priority]
                          }`}
                        >
                          {defect.priority}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {defect.responsible_trade ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          statusClasses[defect.status]
                        }`}
                      >
                        {defect.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelected(defect)
                        }}
                        className="text-[#003A8C] hover:underline text-xs font-medium"
                      >
                        View / Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Detail modal */}
      {selected && (
        <DefectModal
          defect={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
