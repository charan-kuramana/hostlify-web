import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useToastStore } from '../../store/toastStore'
import { getHostelReviews, submitReview } from '../../api/hosteller'

const MAX_LEN = 1000

/** Dashboard card: an active resident rates their hostel (staff see it under Admin → Reviews). */
export default function ReviewCard({ hostelId, hostellerProfileId }: { hostelId: number; hostellerProfileId: number | null }) {
  const queryClient = useQueryClient()
  const { show } = useToastStore()
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(false)

  const { data: summary } = useQuery({
    queryKey: ['hostel-reviews', hostelId],
    queryFn: () => getHostelReviews(hostelId),
  })
  const mine = ((summary?.reviews ?? []) as any[])
    .filter((r) => r.hostellerId === hostellerProfileId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0]

  const mutation = useMutation({
    mutationFn: () => submitReview({ rating, reviewText: text.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel-reviews', hostelId] })
      setEditing(false)
      show('success', 'Thanks for your review', 'Your rating has been shared with the hostel.')
    },
    onError: (e: any) => {
      if (e?.response?.status === 400 || e?.response?.status === 409) return // global toast shows the reason
      show('error', 'Could not submit review', 'Please try again.')
    },
  })

  const showForm = !mine || editing
  const shown = hover || rating

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center"><Star size={13} className="text-amber-500" /></div>
          <h2 className="font-semibold text-gray-800 text-sm">{mine ? 'Your Review' : 'Rate Your Stay'}</h2>
        </div>
        {summary?.totalReviews > 0 && (
          <span className="text-xs text-gray-400 font-medium">
            Hostel rating {Number(summary.averageRating ?? 0).toFixed(1)}★ · {summary.totalReviews} review{summary.totalReviews !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {!showForm ? (
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={16} className={n <= mine.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />)}
            </div>
            {mine.reviewText && <p className="text-sm text-gray-600 mt-1.5">{mine.reviewText}</p>}
          </div>
          <button onClick={() => { setRating(mine.rating ?? 0); setText(mine.reviewText ?? ''); setEditing(true) }} className="text-xs font-semibold text-brand-600 hover:underline shrink-0">Edit</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>
                <Star size={24} className={n <= shown ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
              </button>
            ))}
          </div>
          <textarea rows={2} value={text} maxLength={MAX_LEN} onChange={(e) => setText(e.target.value)}
            placeholder="What do you like about this hostel? What could be better?"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none bg-gray-50 focus:bg-white transition-colors" />
          <div className="flex justify-end gap-2">
            {mine && <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>}
            <button onClick={() => mutation.mutate()} disabled={rating === 0 || mutation.isPending}
              className="px-5 py-2 text-sm rounded-xl font-semibold text-white brand-gradient hover:opacity-90 disabled:opacity-50">
              {mutation.isPending ? 'Submitting…' : mine ? 'Update Review' : 'Submit Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
