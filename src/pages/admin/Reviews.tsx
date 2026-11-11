import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { getReviews } from '../../api/staff'
import { useAuthStore } from '../../store/authStore'

const AVATAR_COLORS = [
  'bg-brand-500', 'bg-emerald-500', 'bg-purple-500',
  'bg-rose-500', 'bg-amber-500', 'bg-teal-500',
]

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function StarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
    </div>
  )
}

export default function Reviews() {
  const { activeHostelId } = useAuthStore()
  const [filter, setFilter] = useState<number | null>(null)

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', activeHostelId],
    queryFn: () => getReviews(activeHostelId!),
    enabled: !!activeHostelId,
  })

  const filtered = filter === null ? reviews : reviews.filter((r: any) => r.rating === filter)
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s: number, r: any) => s + (r.rating ?? 0), 0) / reviews.length).toFixed(1)
    : '0.0'

  // Compute rating breakdown from real data
  const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r: any) => r.rating === stars).length
    const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
    return { stars, pct, count }
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Member Reviews"
        subtitle="Feedback from your residents"
        count={reviews.length}
      />

      {/* Hero rating section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start">
          {/* Big rating */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <span className="text-6xl font-black text-gray-900 leading-none tracking-tight">{avgRating}</span>
            <StarDisplay rating={Math.round(Number(avgRating))} size={18} />
            <span className="text-xs text-gray-400 font-medium">({reviews.length} reviews)</span>
          </div>
          {/* Rating breakdown bars */}
          <div className="flex-1 w-full space-y-2">
            {ratingBreakdown.map(({ stars, pct }) => (
              <div key={stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12 justify-end">
                  <span className="text-xs font-semibold text-gray-600">{stars}</span>
                  <Star size={11} className="text-amber-400 fill-amber-400" />
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-amber-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 font-medium w-8">{pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter(null)}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
            filter === null
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
          }`}
        >
          All
        </button>
        {[5, 4, 3, 2, 1].map((r) => (
          <button
            key={r}
            onClick={() => setFilter(r === filter ? null : r)}
            className={`flex items-center gap-1 px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
              filter === r
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Star size={11} className={filter === r ? 'fill-amber-500 text-amber-500' : 'fill-gray-400 text-gray-400'} />
            {r}
          </button>
        ))}
      </div>

      {/* Review cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Star size={20} className="text-gray-300" />
          </div>
          <p className="font-semibold text-gray-400 text-sm">
            {reviews.length === 0 ? 'No reviews yet' : 'No reviews with this rating'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review: any, i: number) => (
            <div key={review.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                  {getInitials(review.hostellerName ?? review.memberName ?? '??')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                    <p className="font-bold text-gray-800 text-sm">{review.hostellerName ?? review.memberName}</p>
                    <span className="text-xs text-gray-400">
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : (review.date ?? '—')}
                    </span>
                  </div>
                  <StarDisplay rating={review.rating ?? 0} />
                  <p className="text-sm text-gray-600 mt-2.5 leading-relaxed">{review.reviewText ?? review.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
