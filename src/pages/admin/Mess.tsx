import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChefHat, Check, ChevronLeft, ChevronRight, Lightbulb, Receipt, Settings2, Star, Users, X } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { inr, MONTHS } from '../../lib/payments'
import {
  addDays, closeDishSuggestion, errMsg, fmtDay, getDishSuggestions, getHeadcount, getMealRatings, getMessBill, getMessBills,
  getMessSettings, lastMonth, MEAL_LABEL, runMessBill, saveMessSettings, todayIST,
} from '../../api/ops'

const TABS = [
  ['today', 'Headcount', Users],
  ['bill', 'Monthly bill', Receipt],
  ['feedback', 'Ratings & ideas', Star],
  ['settings', 'Settings', Settings2],
] as const

export default function Mess() {
  const { activeHostelId, subRole } = useAuthStore()
  const isManager = !subRole || ['OWNER', 'ADMIN', 'MANAGER'].includes(subRole)
  const [tab, setTab] = useState<string>('today')
  const { data: settings } = useQuery({ queryKey: ['mess-settings', activeHostelId], queryFn: () => getMessSettings(activeHostelId!), enabled: !!activeHostelId })
  const tabs = TABS.filter(([k]) => (k === 'bill' ? subRole !== 'SUPERVISOR' : true))

  return (
    <div>
      <PageHeader title="Mess" subtitle="Who's eating, monthly mess bill, and what residents think of the food" />
      {settings && !settings.enabled && (
        <div className="mb-4 bg-amber-50 text-amber-800 text-sm rounded-xl px-4 py-3">
          Meal opt-out is <b>off</b>. Everyone is counted for every meal. {isManager ? 'Turn it on under Settings so residents can skip meals before the cut-off.' : 'Ask the owner or manager to turn it on.'}
        </div>
      )}
      <div className="flex gap-1 mb-5 overflow-x-auto">
        {tabs.map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap ${tab === k ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            <Icon size={14} /> {l}
          </button>
        ))}
      </div>
      {activeHostelId && tab === 'today' && <Headcount hostelId={activeHostelId} />}
      {activeHostelId && tab === 'bill' && <Billing hostelId={activeHostelId} canBill={isManager} />}
      {activeHostelId && tab === 'feedback' && <Feedback hostelId={activeHostelId} />}
      {activeHostelId && tab === 'settings' && settings && <MessSettingsForm key={settings.updatedAt} hostelId={activeHostelId} s={settings} canEdit={isManager} />}
    </div>
  )
}

function Headcount({ hostelId }: { hostelId: number }) {
  const [date, setDate] = useState(todayIST())
  const { data, isLoading } = useQuery({ queryKey: ['headcount', hostelId, date], queryFn: () => getHeadcount(hostelId, date), refetchInterval: 60_000 })
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => setDate(addDays(date, -1))} aria-label="Previous day" className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center"><ChevronLeft size={16} /></button>
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white" />
        <button onClick={() => setDate(addDays(date, 1))} aria-label="Next day" className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center"><ChevronRight size={16} /></button>
        {date !== todayIST() && <button onClick={() => setDate(todayIST())} className="text-xs font-semibold text-brand-600 ml-1">Today</button>}
      </div>
      {isLoading || !data ? <Spinner /> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.meals.map((m: any) => (
              <div key={m.meal} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wide"><ChefHat size={14} /> {MEAL_LABEL[m.meal]}</div>
                <p className="text-3xl font-bold text-gray-900 mt-2">{m.eating}<span className="text-sm font-medium text-gray-400"> plates</span></p>
                <p className="text-xs text-gray-400 mt-1">{m.residents} residents · {m.skipping} skipping · {m.onLeave} on leave</p>
                {m.skippingNames.length > 0 && <p className="text-xs text-gray-500 mt-2"><b>Skipping:</b> {m.skippingNames.join(', ')}</p>}
              </div>
            ))}
          </div>
          {data.onLeaveNames.length > 0 && <p className="text-xs text-gray-500"><b>On approved leave:</b> {data.onLeaveNames.join(', ')}</p>}
        </>
      )}
    </div>
  )
}

function Billing({ hostelId, canBill }: { hostelId: number; canBill: boolean }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const [period, setPeriod] = useState(lastMonth())
  const { data, isLoading } = useQuery({ queryKey: ['mess-bill', hostelId, period], queryFn: () => getMessBill(hostelId, period.year, period.month) })
  const { data: history = [] } = useQuery({ queryKey: ['mess-bills', hostelId], queryFn: () => getMessBills(hostelId) })
  const mut = useMutation({
    mutationFn: () => runMessBill(hostelId, period.year, period.month),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['mess-bill', hostelId] })
      qc.invalidateQueries({ queryKey: ['mess-bills', hostelId] })
      show('success', 'Mess bill added', `${r.residents} residents charged ${inr(r.totalAmount)} in total for ${r.period}.`)
    },
    onError: (e) => show('error', 'Not billed', errMsg(e)),
  })
  const shift = (n: number) => {
    const t = new Date(Date.UTC(period.year, period.month - 1 + n, 1))
    setPeriod({ year: t.getUTCFullYear(), month: t.getUTCMonth() + 1 })
  }
  const blocked = data && (!data.hasRates ? 'Set per-meal rates in Settings first.' : data.alreadyBilled ? 'Already billed.' : !data.monthEnded ? 'You can bill a month after it ends.' : null)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => shift(-1)} aria-label="Previous month" className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center"><ChevronLeft size={16} /></button>
        <span className="font-semibold text-gray-800 w-24 text-center">{MONTHS[period.month]} {period.year}</span>
        <button onClick={() => shift(1)} aria-label="Next month" className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center"><ChevronRight size={16} /></button>
        {data && <span className="text-xs text-gray-400 ml-2">Rates: breakfast {inr(data.rates.BREAKFAST)}, lunch {inr(data.rates.LUNCH)}, dinner {inr(data.rates.DINNER)}</span>}
      </div>
      {isLoading || !data ? <Spinner /> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="text-left px-4 py-2.5">Resident</th><th className="text-right px-4 py-2.5">Meals</th><th className="text-right px-4 py-2.5">Amount</th></tr></thead>
              <tbody>
                {data.rows.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No residents stayed this month.</td></tr>}
                {data.rows.map((r: any) => (
                  <tr key={r.hostellerId} className="border-t border-gray-50">
                    <td className="px-4 py-2.5">{r.name}{r.note && <span className="block text-[11px] text-amber-600">{r.note}</span>}</td>
                    <td className="px-4 py-2.5 text-right">{r.meals}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${r.billable ? 'text-gray-800' : 'text-gray-300 line-through'}`}>{inr(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-gray-100 bg-gray-50/60 font-bold"><tr><td className="px-4 py-2.5">Total</td><td className="px-4 py-2.5 text-right">{data.totalMeals}</td><td className="px-4 py-2.5 text-right">{inr(data.totalAmount)}</td></tr></tfoot>
            </table>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 flex-1">Each resident gets a <b>Mess</b> charge in My Dues and is notified. Skipped meals and approved leave days aren't billed.</p>
            {canBill && (
              <button disabled={!!blocked || mut.isPending} title={blocked ?? ''} onClick={() => { if (confirm(`Add ${inr(data.totalAmount)} of mess charges for ${MONTHS[period.month]} ${period.year}?`)) mut.mutate() }}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white brand-gradient disabled:opacity-50">{mut.isPending ? 'Adding…' : 'Add to dues'}</button>
            )}
          </div>
          {blocked && <p className="px-4 pb-3 text-xs text-gray-500">{blocked}</p>}
        </div>
      )}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">Billed months</h3>
          <div className="flex flex-wrap gap-2">
            {history.map((b: any) => (
              <span key={b.id} className="text-xs bg-white border border-gray-100 rounded-xl px-3 py-2">{MONTHS[b.periodMonth]} {b.periodYear}: <b>{inr(b.totalAmount)}</b> · {b.residents} residents</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stars({ value }: { value: number }) {
  return <span className="inline-flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={12} className={i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />)}</span>
}

function Feedback({ hostelId }: { hostelId: number }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const { data: r } = useQuery({ queryKey: ['meal-ratings', hostelId], queryFn: () => getMealRatings(hostelId) })
  const { data: ideas = [] } = useQuery({ queryKey: ['dish-ideas', hostelId], queryFn: () => getDishSuggestions(hostelId) })
  const mut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'ADDED' | 'DISMISSED' }) => closeDishSuggestion(id, status),
    onSuccess: (_d, v) => { qc.invalidateQueries({ queryKey: ['dish-ideas', hostelId] }); show('success', v.status === 'ADDED' ? 'Marked as added to the menu' : 'Suggestion dismissed') },
    onError: (e) => show('error', 'Failed', errMsg(e)),
  })
  if (!r) return <Spinner />
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {r.byMeal.map((m: any) => (
            <div key={m.meal} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase">{MEAL_LABEL[m.meal]}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{m.count ? m.average.toFixed(1) : '–'}</p>
              {m.count > 0 && <Stars value={m.average} />}
              <p className="text-[11px] text-gray-400 mt-1">{m.count} ratings · 30 days</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Last 14 days</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-gray-400"><tr><th className="text-left py-1">Day</th><th>Breakfast</th><th>Lunch</th><th>Dinner</th></tr></thead>
              <tbody>
                {[...r.daily].reverse().map((d: any) => (
                  <tr key={d.date} className="border-t border-gray-50">
                    <td className="py-1.5 text-gray-600">{fmtDay(d.date)}</td>
                    {['breakfast', 'lunch', 'dinner'].map((k) => (
                      <td key={k} className={`text-center font-semibold ${d[k] == null ? 'text-gray-200' : d[k] < 3 ? 'text-red-500' : d[k] < 4 ? 'text-amber-600' : 'text-emerald-600'}`}>{d[k] == null ? '–' : d[k].toFixed(1)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {r.comments.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Recent comments</h3>
            <ul className="space-y-2">
              {r.comments.map((c: any, i: number) => (
                <li key={i} className="text-sm"><Stars value={c.rating} /> <span className="text-gray-700">{c.comment}</span>
                  <span className="block text-[11px] text-gray-400">{c.name} · {MEAL_LABEL[c.meal]}, {fmtDay(c.date)}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 self-start">
        <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center gap-1.5"><Lightbulb size={14} className="text-amber-500" /> Dishes residents want</h3>
        <p className="text-xs text-gray-400 mb-3">Most votes first. Mark one as added once it's on the menu.</p>
        {ideas.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">No suggestions yet.</p> : (
          <ul className="divide-y divide-gray-50">
            {ideas.map((s: any) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <span className="w-10 text-center text-sm font-bold text-brand-600">{s.votes}<span className="block text-[10px] font-medium text-gray-400">votes</span></span>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-800 truncate">{s.dish}</p>{s.suggestedBy && <p className="text-[11px] text-gray-400">by {s.suggestedBy}</p>}</div>
                <button onClick={() => mut.mutate({ id: s.id, status: 'ADDED' })} title="Added to menu" className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Check size={14} /></button>
                <button onClick={() => mut.mutate({ id: s.id, status: 'DISMISSED' })} title="Dismiss" className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center"><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function MessSettingsForm({ hostelId, s, canEdit }: { hostelId: number; s: any; canEdit: boolean }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const hm = (t: string) => (t ?? '').slice(0, 5)
  const [f, setF] = useState({ enabled: s.enabled, breakfastTime: hm(s.breakfastTime), lunchTime: hm(s.lunchTime), dinnerTime: hm(s.dinnerTime),
    cutoffHours: s.cutoffHours, breakfastRate: s.breakfastRate, lunchRate: s.lunchRate, dinnerRate: s.dinnerRate, askMealFeedback: !!s.askMealFeedback })
  const mut = useMutation({
    mutationFn: () => saveMessSettings(hostelId, { ...f, cutoffHours: Number(f.cutoffHours) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mess-settings', hostelId] }); show('success', 'Mess settings saved') },
    onError: (e) => show('error', 'Not saved', errMsg(e)),
  })
  const input = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-60'
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-2xl space-y-5">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={f.enabled} disabled={!canEdit} onChange={(e) => setF({ ...f, enabled: e.target.checked })} className="mt-1 w-4 h-4 accent-brand-600" />
        <span><span className="font-semibold text-gray-800 text-sm">Let residents skip meals</span>
          <span className="block text-xs text-gray-400">Everyone eats by default. Residents can skip a meal up to the cut-off, so the kitchen cooks the right amount.</span></span>
      </label>
      <div className="grid grid-cols-3 gap-3">
        {(['breakfast', 'lunch', 'dinner'] as const).map((m) => (
          <label key={m} className="text-xs font-semibold text-gray-500 capitalize">{m} time<input type="time" value={(f as any)[m + 'Time']} disabled={!canEdit} onChange={set(m + 'Time')} className={input + ' mt-1'} /></label>
        ))}
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={f.askMealFeedback} disabled={!canEdit} onChange={(e) => setF({ ...f, askMealFeedback: e.target.checked })} className="mt-1 w-4 h-4 accent-brand-600" />
        <span><span className="font-semibold text-gray-800 text-sm">Ask residents to rate each meal</span>
          <span className="block text-xs text-gray-400">Sends a "How was lunch?" notification about 45 minutes after each meal starts. Residents can always rate meals from their dashboard.</span></span>
      </label>
      <label className="block text-xs font-semibold text-gray-500">Cut-off (hours before each meal)
        <input type="number" min={0} max={48} value={f.cutoffHours} disabled={!canEdit} onChange={set('cutoffHours')} className={input + ' mt-1 max-w-[8rem]'} />
      </label>
      <div>
        <p className="text-xs font-semibold text-gray-500">Per-meal rate for the monthly mess bill (₹, optional)</p>
        <p className="text-[11px] text-gray-400 mb-2">Leave at 0 if mess is included in rent. Residents pay only for the meals they didn't skip.</p>
        <div className="grid grid-cols-3 gap-3">
          {(['breakfast', 'lunch', 'dinner'] as const).map((m) => (
            <label key={m} className="text-xs text-gray-500 capitalize">{m}<input type="number" min={0} step="0.5" value={(f as any)[m + 'Rate']} disabled={!canEdit} onChange={set(m + 'Rate')} className={input + ' mt-1'} /></label>
          ))}
        </div>
      </div>
      {canEdit ? (
        <button onClick={() => mut.mutate()} disabled={mut.isPending} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold brand-gradient disabled:opacity-60">{mut.isPending ? 'Saving…' : 'Save settings'}</button>
      ) : <p className="text-xs bg-gray-50 text-gray-500 px-3 py-2 rounded-xl">Only the owner, admin or manager can change mess settings.</p>}
    </div>
  )
}

function Spinner() {
  return <div className="flex justify-center py-10"><div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" /></div>
}
