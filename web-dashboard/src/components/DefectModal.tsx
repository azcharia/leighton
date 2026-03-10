// src/components/DefectModal.tsx
import { useState } from 'react'
import { X, Save, CheckCircle, Image as ImageIcon } from 'lucide-react'
import type { Defect } from '../lib/supabase'

interface Props {
  defect: Defect
  onClose: () => void
  onSave: (updated: Defect) => Promise<void>
}

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'] as const
const STATUSES   = ['Pending AI', 'Processed', 'Resolved'] as const

const priorityColors: Record<string, string> = {
  Low:      'bg-green-100  border-green-300  text-green-800',
  Medium:   'bg-yellow-100 border-yellow-300 text-yellow-800',
  High:     'bg-orange-100 border-orange-300 text-orange-800',
  Critical: 'bg-red-100    border-red-300    text-red-800',
}

export function DefectModal({ defect, onClose, onSave }: Props) {
  const [form, setForm] = useState<Defect>({ ...defect })
  const [saving, setSaving] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleChange = <K extends keyof Defect>(key: K, value: Defect[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  // Prevent background scroll while modal is open
  const stopProp = (e: React.MouseEvent) => e.stopPropagation()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={stopProp}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Defect Detail</h2>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              {defect.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Body: two-column layout ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* LEFT — Photo + Transcript */}
          <div className="flex flex-col gap-4">
            {/* Photo */}
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
              {imageError ? (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <ImageIcon size={40} />
                  <p className="text-sm">Image unavailable</p>
                </div>
              ) : (
                <img
                  src={defect.image_url}
                  alt="Defect photo"
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              )}
            </div>

            {/* Audio transcript */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Engineer's Voice Note (Transcript)
              </label>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 leading-relaxed min-h-[80px]">
                {defect.audio_transcript || (
                  <span className="italic text-gray-400">
                    No transcript available.
                  </span>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="text-xs text-gray-400 space-y-0.5">
              <p>
                <span className="font-medium text-gray-500">Created:</span>{' '}
                {new Date(defect.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* RIGHT — Editable AI Predictions */}
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#003A8C]" />
                AI Classification
                {defect.status === 'Processed' && (
                  <span className="ml-auto flex items-center gap-1 text-green-600 text-xs font-medium">
                    <CheckCircle size={13} /> Processed
                  </span>
                )}
              </h3>

              {/* Defect Type */}
              <Field label="Defect Type">
                <input
                  type="text"
                  value={form.defect_type ?? ''}
                  onChange={(e) => handleChange('defect_type', e.target.value)}
                  placeholder="e.g. Concrete crack"
                  className="input"
                />
              </Field>

              {/* Priority */}
              <Field label="Priority">
                <div className="flex flex-wrap gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleChange('priority', p)}
                      className={`px-3 py-1 rounded-full border text-xs font-semibold transition ${
                        form.priority === p
                          ? priorityColors[p] + ' ring-2 ring-offset-1 ring-current'
                          : 'border-gray-200 text-gray-500 hover:border-gray-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Responsible Trade */}
              <Field label="Responsible Trade">
                <input
                  type="text"
                  value={form.responsible_trade ?? ''}
                  onChange={(e) =>
                    handleChange('responsible_trade', e.target.value)
                  }
                  placeholder="e.g. Civil, MEP, Steel"
                  className="input"
                />
              </Field>

              {/* Suggested Action */}
              <Field label="Suggested Action">
                <textarea
                  rows={4}
                  value={form.suggested_action ?? ''}
                  onChange={(e) =>
                    handleChange('suggested_action', e.target.value)
                  }
                  placeholder="Describe the recommended remedial action…"
                  className="input resize-none"
                />
              </Field>

              {/* Status */}
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) =>
                    handleChange(
                      'status',
                      e.target.value as Defect['status']
                    )
                  }
                  className="input"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-[#003A8C] text-white text-sm font-semibold hover:bg-[#002d72] transition disabled:opacity-60"
          >
            {saving ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Saving…
              </>
            ) : (
              <>
                <Save size={15} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tailwind utility for form inputs — defined inline to avoid purging */}
      <style>{`
        .input {
          @apply w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                 focus:outline-none focus:ring-2 focus:ring-[#003A8C]/40 focus:border-[#003A8C]
                 bg-white transition;
        }
      `}</style>
    </div>
  )
}

// ── Helper: form field wrapper ─────────────────────────────────────────────
function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}
