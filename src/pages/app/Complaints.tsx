import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, MessageSquare } from 'lucide-react'
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

const CATEGORIES = ['Maintenance', 'Cleanliness', 'Food', 'Noise', 'Security', 'Other']

const CATEGORY_COLORS: Record<string, string> = {
  Maintenance: 'bg-blue-50 text-blue-700',
  Cleanliness: 'bg-teal-50 text-teal-700',
  Food: 'bg-orange-50 text-orange-700',
  Noise: 'bg-purple-50 text-purple-700',
  Security: 'bg-red-50 text-red-700',
  Other: 'bg-gray-100 text-gray-600',
}

export default function Complaints() {
  const { hostellerProfileId, hostelId } = useAuthStore()
  const queryClient = useQueryClient()
  const { show } = useToastStore()

  const [showForm, setShowForm] = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')
  const [form, setForm] = useState({ title: '', category: '', description: '' })
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const { data: complaints, isLoading, error } = useQuery({
    queryKey: ['my-complaints', hostellerProfileId],
    queryFn: () => getMyComplaints(hostellerProfileId!),
    enabled: !!hostellerProfileId,
  })

  const createMutation = useMutation({
    mutationFn: createComplaint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-complaints', hostellerProfileId] })
      setShowForm(false)
      setForm({ title: '', category: '', description: '' })
      show('success', 'Complaint submitted', 'Your complaint has been registered.')
    },
    onError: (e: any) => {
      // 400/409 already toast the server's reason (api/client.ts)
      if (![400, 409].includes(e?.response?.status)) show('error', 'Failed to submit', 'Could not submit your complaint. Please try again.')
    },
  })

  function validate() {
    const e: Partial<typeof form> = {}
    if (!form.title.trim())       e.title       = 'Title is required'
    else if (form.title.trim().length > 200) e.title = 'Title must be 200 characters or less'
    if (!form.category)           e.category    = 'Category is required'
    if (!form.description.trim()) e.description = 'Description is required'
    else if (form.description.trim().length > 2000) e.description = 'Description must be 2000 characters or less'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    createMutation.mutate({
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      hostellerProfileId,
      hostelId,
    })
  }

  const complaintsList = complaints ?? []

  const filtered = activeCategory === 'All'
    ? complaintsList
    : complaintsList.filter((c: any) => c.category === activeCategory)

  if (!hostelId) return <NoStay title="Complaints" subtitle="Raise and track your complaints" />

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  if (error) return <div className="text-center py-20 text-gray-400">Failed to load data</div>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Complaints"
        subtitle="Raise and track your complaints"
        count={complaintsList.length}
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
          >
            <Plus size={16} /> Raise Complaint
          </button>
        }
      />

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {['All', ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* New complaint form card */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid #e0e7ff' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
                <MessageSquare size={14} className="text-brand-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">New Complaint</h3>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Title</label>
                <input
                  maxLength={200}
                  value={form.title}
                  onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setErrors((er) => ({ ...er, title: undefined })) }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors ${errors.title ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="Brief title of the issue"
                />
                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => { setForm((f) => ({ ...f, category: e.target.value })); setErrors((er) => ({ ...er, category: undefined })) }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors ${errors.category ? 'border-red-400' : 'border-gray-200'}`}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
              <textarea
                rows={3}
                maxLength={2000}
                value={form.description}
                onChange={(e) => { setForm((f) => ({ ...f, description: e.target.value })); setErrors((er) => ({ ...er, description: undefined })) }}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-gray-50 focus:bg-white transition-colors ${errors.description ? 'border-red-400' : 'border-gray-200'}`}
                placeholder="Describe the issue in detail…"
              />
              {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
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

      {/* Complaints cards */}
      <div className="space-y-3">
        {filtered.map((c: any) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 text-sm">{c.title}</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${CATEGORY_COLORS[c.category] ?? 'bg-gray-100 text-gray-600'}`}>
                  {c.category}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge status={c.status} />
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{c.description}</p>
            <p className="text-xs text-gray-400 mt-2.5 font-medium">Submitted {fmtDate(c.createdAt)}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={22} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-500 text-sm">No complaints in this category</p>
            <p className="text-xs text-gray-400 mt-1">Try a different filter or raise a new complaint</p>
          </div>
        )}
      </div>
    </div>
  )
}
