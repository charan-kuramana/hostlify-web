import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Megaphone } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { getAnnouncements } from '../../api/hosteller'
import NoStay from './NoStay'

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const CATEGORIES = ['All', 'General', 'Maintenance', 'Event', 'Fee']

const CATEGORY_CONFIG: Record<string, { badge: string; border: string; dot: string }> = {
  General:     { badge: 'bg-gray-100 text-gray-600',    border: 'border-l-gray-300',   dot: 'bg-gray-400' },
  Maintenance: { badge: 'bg-amber-100 text-amber-700',  border: 'border-l-amber-400',  dot: 'bg-amber-400' },
  Event:       { badge: 'bg-purple-100 text-purple-700',border: 'border-l-purple-400', dot: 'bg-purple-400' },
  Fee:         { badge: 'bg-red-100 text-red-700',      border: 'border-l-red-400',    dot: 'bg-red-400' },
}

const DEFAULT_CONFIG = { badge: 'bg-gray-100 text-gray-600', border: 'border-l-gray-300', dot: 'bg-gray-400' }

export default function Announcements() {
  const { hostelId } = useAuthStore()
  const [activeCategory, setActiveCategory] = useState('All')

  const { data: announcements, isLoading, error } = useQuery({
    queryKey: ['announcements', hostelId],
    queryFn: () => getAnnouncements(hostelId!),
    enabled: !!hostelId,
  })

  const announcementsList = announcements ?? []

  const filtered = activeCategory === 'All'
    ? announcementsList
    : announcementsList.filter((a: any) => a.category === activeCategory)

  if (!hostelId) return <NoStay title="Announcements" subtitle="Stay updated with the latest from management" />

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  if (error) return <div className="text-center py-20 text-gray-400">Failed to load data</div>

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        subtitle="Stay updated with the latest from management"
        count={filtered.length}
      />

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
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

      {/* Announcement cards */}
      <div className="space-y-3">
        {filtered.map((a: any) => {
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
                <span className="text-xs font-medium text-gray-400 whitespace-nowrap shrink-0 bg-gray-50 px-2.5 py-1 rounded-lg">
                  {fmtDate(a.validFrom)}
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed pl-3.5">{a.content}</p>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Megaphone size={22} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-500 text-sm">No announcements in this category</p>
            <p className="text-xs text-gray-400 mt-1">Check back later or try a different filter</p>
          </div>
        )}
      </div>
    </div>
  )
}
