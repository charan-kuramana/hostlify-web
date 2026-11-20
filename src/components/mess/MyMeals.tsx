import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lightbulb, Lock, ThumbsUp } from 'lucide-react'
import { errMsg, fmtDay, getMyMeals, getMySuggestions, MEAL_LABEL, rateMeal, setMealSkip, suggestDish, voteDish } from '../../api/ops'
import { useToastStore } from '../../store/toastStore'
import { StarsRow } from '../complaints/Sla'

/** Resident: skip meals before the cut-off, rate recent meals, suggest and vote for dishes. */
export default function MyMeals() {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const { data, isLoading, error } = useQuery({ queryKey: ['my-meals'], queryFn: getMyMeals, retry: false })
  const skip = useMutation({
    mutationFn: ({ date, meal, skip }: { date: string; meal: string; skip: boolean }) => setMealSkip(date, meal, skip),
    onSuccess: (d) => qc.setQueryData(['my-meals'], d),
    onError: (e) => show('error', 'Not changed', errMsg(e)),
  })
  if (isLoading) return null
  if (error || !data) return null

  return (
    <div className="space-y-4">
      {data.enabled && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800">My meals</h3>
          <p className="text-xs text-gray-400 mb-3">You're counted for every meal. Tap a meal to skip it, at least {data.cutoffHours} hour(s) before it's served, so less food is wasted.
            {Object.values(data.rates as Record<string, number>).some((r) => Number(r) > 0) && ' Skipped meals are not billed.'}</p>
          <div className="space-y-2">
            {data.days.map((d: any) => (
              <div key={d.date} className="flex items-center gap-2 flex-wrap">
                <span className="w-24 text-xs font-semibold text-gray-600">{fmtDay(d.date)}</span>
                {d.onLeave ? <span className="text-xs text-purple-600 bg-purple-50 rounded-lg px-2 py-1">On leave</span> : d.meals.map((m: any) => (
                  <button key={m.meal} disabled={m.locked || skip.isPending} onClick={() => skip.mutate({ date: d.date, meal: m.meal, skip: !m.skipped })}
                    title={m.locked ? 'Cut-off passed' : m.skipped ? 'Tap to eat' : 'Tap to skip'}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${m.skipped ? 'bg-gray-100 text-gray-400 line-through border-gray-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} ${m.locked ? 'opacity-60' : ''}`}>
                    {m.locked && <Lock size={10} />} {MEAL_LABEL[m.meal]}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <RateMeals rateable={data.rateable} />
      <Suggestions />
    </div>
  )
}

function RateMeals({ rateable }: { rateable: any[] }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const [open, setOpen] = useState(false)
  const mut = useMutation({
    mutationFn: ({ date, meal, rating }: { date: string; meal: string; rating: number }) => rateMeal(date, meal, rating),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-meals'] }); show('success', 'Thanks for rating') },
    onError: (e) => show('error', 'Not saved', errMsg(e)),
  })
  if (!rateable.length) return null
  const unrated = rateable.filter((r) => r.rating == null)
  const shown = open ? rateable : rateable.slice(0, 3)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-gray-800">How was the food?</h3>
      <p className="text-xs text-gray-400 mb-3">{unrated.length ? `${unrated.length} recent meal(s) to rate. Only the kitchen team sees averages.` : 'Thanks, you have rated all recent meals.'}</p>
      <ul className="space-y-2">
        {shown.map((r) => (
          <li key={r.date + r.meal} className="flex items-center gap-3">
            <span className="flex-1 text-sm text-gray-700">{MEAL_LABEL[r.meal]} <span className="text-xs text-gray-400">· {fmtDay(r.date)}</span></span>
            <StarsRow value={r.rating ?? 0} onChange={(n) => mut.mutate({ date: r.date, meal: r.meal, rating: n })} size={20} />
          </li>
        ))}
      </ul>
      {rateable.length > 3 && <button onClick={() => setOpen(!open)} className="text-xs font-semibold text-brand-600 mt-2">{open ? 'Show less' : `Show all ${rateable.length}`}</button>}
    </div>
  )
}

function Suggestions() {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const [dish, setDish] = useState('')
  const { data: list = [] } = useQuery({ queryKey: ['my-dish-ideas'], queryFn: getMySuggestions })
  const add = useMutation({
    mutationFn: () => suggestDish(dish.trim()),
    onSuccess: () => { setDish(''); qc.invalidateQueries({ queryKey: ['my-dish-ideas'] }); show('success', 'Suggestion added') },
    onError: (e) => show('error', 'Not added', errMsg(e)),
  })
  const vote = useMutation({
    mutationFn: ({ id, up }: { id: number; up: boolean }) => voteDish(id, up),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-dish-ideas'] }),
    onError: (e) => show('error', 'Vote not saved', errMsg(e)),
  })
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-gray-800 flex items-center gap-1.5"><Lightbulb size={15} className="text-amber-500" /> Suggest a dish</h3>
      <p className="text-xs text-gray-400 mb-3">Vote for what you'd like on the menu. The most popular ideas go to the kitchen.</p>
      <div className="flex gap-2 mb-3">
        <input value={dish} onChange={(e) => setDish(e.target.value)} maxLength={100} placeholder="e.g. Gongura chicken" onKeyDown={(e) => e.key === 'Enter' && dish.trim().length >= 2 && add.mutate()}
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400" />
        <button onClick={() => add.mutate()} disabled={dish.trim().length < 2 || add.isPending} className="px-4 rounded-xl text-sm font-semibold text-white brand-gradient disabled:opacity-50">Add</button>
      </div>
      <ul className="divide-y divide-gray-50">
        {(list as any[]).map((s) => (
          <li key={s.id} className="flex items-center gap-3 py-2">
            <span className="flex-1 text-sm text-gray-700">{s.dish}{s.mine && <span className="text-[10px] text-gray-400"> · yours</span>}</span>
            <button onClick={() => vote.mutate({ id: s.id, up: !s.myVote })} aria-pressed={s.myVote}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${s.myVote ? 'bg-brand-600 text-white border-transparent' : 'border-gray-200 text-gray-500'}`}>
              <ThumbsUp size={12} /> {s.votes}
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="text-xs text-gray-400 py-2">No suggestions yet. Be the first!</li>}
      </ul>
    </div>
  )
}
