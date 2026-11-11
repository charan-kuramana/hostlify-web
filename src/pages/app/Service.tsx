import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Wrench, Zap, Droplets, Sofa, SprayCan, Wind, HelpCircle } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { getMyComplaints, createComplaint } from '../../api/hosteller'
import NoStay from './NoStay'

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const SERVICE_CATEGORIES = ['Plumbing', 'Electrical', 'Furniture', 'Cleaning', 'AC / Cooling', 'Other']

const CATEGORY_ICONS: Record<string, { icon: typeof Wrench; bg: string; color: string }> = {
  'Plumbing':    { icon: Droplets, bg: 'bg-blue-50',   color: 'text-blue-600' },
  'Electrical':  { icon: Zap,      bg: 'bg-amber-50',  color: 'text-amber-600' },
  'Furniture':   { icon: Sofa,     bg: 'bg-purple-50', color: 'text-purple-600' },
  'Cleaning':    { icon: SprayCan, bg: 'bg-teal-50',   color: 'text-teal-600' },
  'AC / Cooling':{ icon: Wind,     bg: 'bg-sky-50',    color: 'text-sky-600' },
  'Other':       { icon: HelpCircle,bg: 'bg-gray-100', color: 'text-gray-500' },
}

const STATUS_CHIP: Record<string, string> = {
  'Maintenance': 'bg-blue-50 text-blue-700',
  'Electrical':  'bg-amber-50 text-amber-700',
  'Plumbing':    'bg-cyan-50 text-cyan-700',
  'Furniture':   'bg-purple-50 text-purple-700',
  'Cleaning':    'bg-teal-50 text-teal-700',
  'AC / Cooling':'bg-sky-50 text-sky-700',
  'Other':       'bg-gray-100 text-gray-600',
}

export default function Service() {
  const { hostellerProfileId, hostelId } = useAuthStore()
  const queryClient = useQueryClient()
  const { show } = useToastStore()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category: '', description: '' })

  const { data: services, isLoading, error } = useQuery({
    queryKey: ['my-complaints', hostellerProfileId],
    queryFn: () => getMyComplaints(hostellerProfileId!),
    enabled: !!hostellerProfileId,
  })

  const createMutation = useMutation({
    mutationFn: createComplaint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-complaints', hostellerProfileId] })
      setShowForm(false)
      setForm({ category: '', description: '' })
      show('success', 'Request submitted', 'Our staff will attend to it shortly.')
    },
    onError: (e: any) => {
      if (![400, 409].includes(e?.response?.status)) show('error', 'Failed to submit', 'Could not submit your request. Please try again.')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category || !form.description.trim()) return
    createMutation.mutate({
      category: form.category,
      description: form.description.trim(),
      hostellerProfileId,
      hostelId,
      title: `${form.category} Issue`,
    })
  }

  function selectCategory(cat: string) {
    setForm((f) => ({ ...f, category: cat }))
    setShowForm(true)
  }

  const servicesList = (services ?? []).filter((s: any) =>
    SERVICE_CATEGORIES.includes(s.category)
  )

  if (!hostelId) return <NoStay title="Service Requests" subtitle="Request maintenance and other services" />

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  if (error) return <div className="text-center py-20 text-gray-400">Failed to load data</div>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Requests"
        subtitle="Request maintenance and other services"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
          >
            <Plus size={16} /> New Request
          </button>
        }
      />

      {/* Category quick-select */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {SERVICE_CATEGORIES.map((cat) => {
          const cfg = CATEGORY_ICONS[cat] ?? CATEGORY_ICONS['Other']
          return (
            <button
              key={cat}
              onClick={() => selectCategory(cat)}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-sm ${cfg.bg} ${
                form.category === cat && showForm
                  ? 'ring-2 ring-brand-400 border-transparent'
                  : 'border-transparent'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl bg-white/80 flex items-center justify-center shadow-sm ${cfg.color}`}>
                <cfg.icon size={16} />
              </div>
              <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight">{cat}</span>
            </button>
          )
        })}
      </div>

      {/* New request form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid #e0e7ff' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
                <Wrench size={14} className="text-brand-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">New Service Request</h3>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors"
              >
                <option value="">Select category</option>
                {SERVICE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
              <textarea
                required
                rows={3}
                maxLength={2000}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-gray-50 focus:bg-white transition-colors"
                placeholder="Describe the issue…"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-5 py-2 text-sm rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
              >
                {createMutation.isPending ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Current requests cards */}
      <div className="space-y-3">
        {servicesList.map((s: any) => (
          <div
            key={s.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {(() => {
                  const cfg = CATEGORY_ICONS[s.category] ?? CATEGORY_ICONS['Other']
                  return (
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <cfg.icon size={16} className={cfg.color} />
                    </div>
                  )
                })()}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_CHIP[s.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {s.category}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 mt-1">{s.description}</p>
                  <p className="text-xs text-gray-400 mt-1 font-medium">Submitted {fmtDate(s.createdAt)}</p>
                </div>
              </div>
              <Badge status={s.status} />
            </div>
          </div>
        ))}
        {servicesList.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Wrench size={22} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-500 text-sm">No service requests yet</p>
            <p className="text-xs text-gray-400 mt-1">Tap a category above or use the New Request button</p>
          </div>
        )}
      </div>
    </div>
  )
}
