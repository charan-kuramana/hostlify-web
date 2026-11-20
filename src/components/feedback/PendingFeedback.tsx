import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star, UtensilsCrossed, Wrench, Building2 } from 'lucide-react'
import { getPendingFeedback, submitStayReview } from '../../api/hosteller'
import { MEAL_LABEL, errMsg, rateComplaint, rateMeal } from '../../api/ops'
import { useToastStore } from '../../store/toastStore'

function Stars({ onPick, disabled }: { onPick: (n: number) => void; disabled?: boolean }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={disabled} onMouseEnter={() => setHover(n)} onClick={() => onPick(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className="p-0.5 disabled:opacity-50">
          <Star size={22} className={n <= hover ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
        </button>
      ))}
    </div>
  )
}

const dayLabel = (iso: string) => {
  const today = new Date().toLocaleDateString('en-CA')
  return iso === today ? "today's" : "yesterday's"
}

/** One card that asks for whatever the resident hasn't rated yet: meals, fixed complaints, a finished stay. */
export default function PendingFeedback() {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const { data } = useQuery({ queryKey: ['pending-feedback'], queryFn: getPendingFeedback, retry: false, staleTime: 60000 })
  const [stayText, setStayText] = useState('')
  const done = (msg: string) => { qc.invalidateQueries({ queryKey: ['pending-feedback'] }); show('success', msg, 'Thank you!') }

  const meal = useMutation({
    mutationFn: (v: { date: string; meal: string; rating: number }) => rateMeal(v.date, v.meal, v.rating),
    onSuccess: () => done('Meal rated'), onError: (e) => show('error', 'Could not save', errMsg(e)),
  })
  const complaint = useMutation({
    mutationFn: (v: { id: number; rating: number }) => rateComplaint(v.id, v.rating),
    onSuccess: () => done('Thanks for rating the fix'), onError: (e) => show('error', 'Could not save', errMsg(e)),
  })
  const stay = useMutation({
    mutationFn: (v: { bookingId: number; rating: number }) => submitStayReview({ bookingId: v.bookingId, rating: v.rating, reviewText: stayText.trim() || undefined }),
    onSuccess: () => done('Review posted'), onError: (e) => show('error', 'Could not save', errMsg(e)),
  })

  const meals: any[] = data?.meals ?? []
  const complaints: any[] = data?.complaints ?? []
  const stays: any[] = data?.stays ?? []
  if (!meals.length && !complaints.length && !stays.length) return null

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-4">
      <div>
        <p className="font-semibold text-gray-900 text-sm">How was it?</p>
        <p className="text-xs text-gray-400">One tap each. Your ratings go to the hostel and help them improve.</p>
      </div>
      {stays.map((s) => (
        <div key={`s${s.bookingId}`} className="flex flex-col gap-2 border-t border-gray-50 pt-3">
          <div className="flex items-center gap-2 text-sm text-gray-700"><Building2 size={15} className="text-brand-600" /> Rate your stay at <b>{s.hostelName}</b></div>
          <textarea value={stayText} onChange={(e) => setStayText(e.target.value)} rows={2} maxLength={1000} placeholder="Optional: what was good, what could be better?"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300" />
          <Stars disabled={stay.isPending} onPick={(n) => stay.mutate({ bookingId: s.bookingId, rating: n })} />
        </div>
      ))}
      {meals.map((m) => (
        <div key={`m${m.date}${m.meal}`} className="flex items-center justify-between gap-3 border-t border-gray-50 pt-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-700"><UtensilsCrossed size={15} className="text-amber-500" /> {dayLabel(m.date)} {MEAL_LABEL[m.meal]?.toLowerCase() ?? m.meal}</div>
          <Stars disabled={meal.isPending} onPick={(n) => meal.mutate({ date: m.date, meal: m.meal, rating: n })} />
        </div>
      ))}
      {complaints.map((c) => (
        <div key={`c${c.id}`} className="flex items-center justify-between gap-3 border-t border-gray-50 pt-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0"><Wrench size={15} className="text-emerald-600 shrink-0" /> <span className="truncate">Fixed: {c.title}</span></div>
          <Stars disabled={complaint.isPending} onPick={(n) => complaint.mutate({ id: c.id, rating: n })} />
        </div>
      ))}
    </div>
  )
}
