import { useState } from 'react'
import { Plus, X, Megaphone } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import PageHeader from '../../components/ui/PageHeader'
import { getAllAnnouncements, createAnnouncement, deleteAnnouncement } from '../../api/staff'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'

const CATEGORIES = ['General', 'Maintenance', 'Event', 'Fee', 'Emergency']

const CATEGORY_CONFIG: Record<string, { badge: string; border: string; dot: string }> = {
  General:     { badge: 'bg-gray-100 text-gray-600',     border: 'border-l-gray-300',    dot: 'bg-gray-400' },
  Maintenance: { badge: 'bg-amber-100 text-amber-700',   border: 'border-l-amber-400',   dot: 'bg-amber-400' },
  Event:       { badge: 'bg-purple-100 text-purple-700', border: 'border-l-purple-400',  dot: 'bg-purple-400' },
  Fee:         { badge: 'bg-red-100 text-red-700',       border: 'border-l-red-400',     dot: 'bg-red-400' },
  Emergency:   { badge: 'bg-red-200 text-red-800',       border: 'border-l-red-600',     dot: 'bg-red-600' },
}

const DEFAULT_CONFIG = { badge: 'bg-gray-100 text-gray-600', border: 'border-l-gray-300', dot: 'bg-gray-400' }

export default function AdminAnnouncements() {
  const { activeHostelId } = useAuthStore()
  const queryClient = useQueryClient()
  const { show } = useToastStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: '' })

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements', activeHostelId],
    queryFn: () => getAllAnnouncements(activeHostelId!),
    enabled: !!activeHostelId,
  })

  const createMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => createAnnouncement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', activeHostelId] })
      setShowForm(false)
      setForm({ title: '', content: '', category: '' })
      show('success', 'Announcement published', 'Your announcement has been posted.')
    },
    onError: () => {
      show('error', 'Failed to publish', 'Could not publish the announcement. Please try again.')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAnnouncement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', activeHostelId] })
      show('success', 'Announcement deleted')
    },
    onError: () => {
      show('error', 'Failed to delete announcement')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.content.trim()) { show('error', 'Title and message are required'); return }
    // hostelId: owners with several hostels post to the one selected, not their first hostel
    createMut.mutate({ hostelId: activeHostelId, title: form.title.trim(), content: form.content.trim(), category: form.category || undefined })
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        subtitle="Post updates to all residents"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
          >
            <Plus size={16} /> New Announcement
          </button>
        }
      />

      {/* New announcement form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid #d1fae5' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Megaphone size={14} className="text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">New Announcement</h3>
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
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors"
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
                <select
                  required
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-gray-50 focus:bg-white transition-colors"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Content</label>
              <textarea
                required
                rows={4}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-gray-50 focus:bg-white transition-colors"
                placeholder="Announcement details…"
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
                disabled={createMut.isPending}
                className="px-5 py-2 text-sm rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
              >
                {createMut.isPending ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcement cards */}
      <div className="space-y-3">
        {announcements.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Megaphone size={20} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-400 text-sm">No announcements yet</p>
          </div>
        )}
        {announcements.map((a: any) => {
          const cfg = CATEGORY_CONFIG[a.category] ?? DEFAULT_CONFIG
          return (
            <div
              key={a.id}
              className={`bg-white rounded-2xl border border-gray-100 border-l-4 shadow-sm p-5 hover:shadow-md transition-all duration-200 ${cfg.border}`}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                  <h3 className="font-bold text-gray-900 text-sm">{a.title}</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
                    {a.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-gray-400 whitespace-nowrap bg-gray-50 px-2.5 py-1 rounded-lg">
                    {a.validFrom ? new Date(a.validFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    {a.validTill ? ` – ${new Date(a.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                  </span>
                  <button
                    onClick={() => { if (window.confirm(`Delete "${a.title}"? Residents will no longer see it.`)) deleteMut.mutate(a.id) }}
                    disabled={deleteMut.isPending}
                    title="Delete announcement"
                    aria-label="Delete announcement"
                    className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed pl-3.5">{a.content}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
