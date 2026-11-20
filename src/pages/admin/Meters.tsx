import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Droplets, Trash2, Zap } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { inr, MONTHS } from '../../lib/payments'
import { billMeters, deleteMeterReading, errMsg, getMeterMonth, lastMonth, saveMeterReading } from '../../api/ops'
import UtilitiesIncludedNote from '../../components/payments/UtilitiesIncludedNote'

export default function Meters() {
  const { activeHostelId, subRole } = useAuthStore()
  const canBill = !subRole || ['OWNER', 'ADMIN', 'MANAGER'].includes(subRole)
  const qc = useQueryClient()
  const { show } = useToastStore()
  const [type, setType] = useState<'ELECTRICITY' | 'WATER'>('ELECTRICITY')
  const [p, setP] = useState(lastMonth())
  const key = ['meters', activeHostelId, type, p.year, p.month]
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => getMeterMonth(activeHostelId!, type, p.year, p.month), enabled: !!activeHostelId })
  const [rateInput, setRate] = useState<string | null>(null) // null = use last month's rate
  const rate = rateInput ?? (data ? String(data.lastRate ?? '') : '')
  const [fixed, setFixed] = useState('')
  const shift = (n: number) => { const d = new Date(Date.UTC(p.year, p.month - 1 + n, 1)); setP({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }) }
  const refresh = () => qc.invalidateQueries({ queryKey: ['meters', activeHostelId] })

  const bill = useMutation({
    mutationFn: () => billMeters(activeHostelId!, type, p.year, p.month),
    onSuccess: (r) => { refresh(); show('success', 'Charges added', `${r.charges} charges across ${r.rooms} rooms, ${inr(r.totalAmount)} in total.${r.skipped.length ? ' Skipped: ' + r.skipped.join('; ') : ''}`) },
    onError: (e) => show('error', 'Not billed', errMsg(e)),
  })
  const rooms = (data?.rooms ?? []) as any[]
  const drafts = rooms.filter((r) => r.reading?.status === 'DRAFT')
  const draftTotal = drafts.reduce((s, r) => s + Number(r.reading.amount), 0)

  return (
    <div>
      <PageHeader title="Meter readings" subtitle="Enter each room's monthly reading. Billing splits the room's amount across its residents by days stayed." />
      <UtilitiesIncludedNote hostelId={activeHostelId} />
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {([['ELECTRICITY', 'Electricity', Zap], ['WATER', 'Water', Droplets]] as const).map(([k, l, Icon]) => (
          <button key={k} onClick={() => { setType(k); setRate(null) }} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold ${type === k ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}><Icon size={14} /> {l}</button>
        ))}
        <span className="w-px h-6 bg-gray-200 mx-1" />
        <button onClick={() => shift(-1)} aria-label="Previous month" className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center"><ChevronLeft size={16} /></button>
        <span className="font-semibold text-gray-800 w-24 text-center">{MONTHS[p.month]} {p.year}</span>
        <button onClick={() => shift(1)} aria-label="Next month" className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center"><ChevronRight size={16} /></button>
      </div>
      <div className="flex items-end gap-3 flex-wrap mb-3">
        <label className="text-xs font-semibold text-gray-500">Rate per unit (₹)<input type="number" min={0} step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} className="block mt-1 w-28 px-3 py-2 rounded-xl border border-gray-200 text-sm" /></label>
        <label className="text-xs font-semibold text-gray-500">Fixed charge per room (₹, optional)<input type="number" min={0} value={fixed} onChange={(e) => setFixed(e.target.value)} className="block mt-1 w-28 px-3 py-2 rounded-xl border border-gray-200 text-sm" /></label>
        <p className="text-[11px] text-gray-400 flex-1 min-w-[12rem]">Used for new readings you save below. Last month's closing reading is filled in automatically.</p>
      </div>
      {isLoading || !data ? <p className="text-sm text-gray-400">Loading…</p> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500"><tr>
              <th className="text-left px-4 py-2.5">Room</th><th className="px-2 py-2.5">Residents</th><th className="px-2 py-2.5">Previous</th><th className="px-2 py-2.5">Current</th>
              <th className="px-2 py-2.5">Units</th><th className="px-2 py-2.5 text-right">Amount</th><th className="px-2 py-2.5"></th>
            </tr></thead>
            <tbody>{rooms.map((r) => <MeterRow key={r.roomId + type + p.month} r={r} hostelId={activeHostelId!} type={type} period={p} rate={rate} fixed={fixed} onSaved={refresh} />)}</tbody>
          </table>
        </div>
      )}
      {canBill && data && (
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button disabled={!drafts.length || !data.monthEnded || bill.isPending}
            onClick={() => confirm(`Bill ${drafts.length} room(s), ${inr(draftTotal)} in total, to their residents?`) && bill.mutate()}
            className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold brand-gradient disabled:opacity-50">{bill.isPending ? 'Billing…' : `Bill residents (${drafts.length} rooms, ${inr(draftTotal)})`}</button>
          {!data.monthEnded && <span className="text-xs text-gray-500">You can bill a month after it ends.</span>}
          <span className="text-xs text-gray-400">{type === 'ELECTRICITY' ? 'Added as an Electricity charge.' : 'Added as an Other charge labelled Water.'} Residents are notified.</span>
        </div>
      )}
    </div>
  )
}

function MeterRow({ r, hostelId, type, period, rate, fixed, onSaved }: any) {
  const { show } = useToastStore()
  const rd = r.reading
  const billed = rd?.status === 'BILLED'
  const [prev, setPrev] = useState(rd ? String(rd.previousReading) : r.previousReading != null ? String(r.previousReading) : '')
  const [curr, setCurr] = useState(rd ? String(rd.currentReading) : '')
  const save = useMutation({
    mutationFn: () => saveMeterReading(hostelId, { roomId: r.roomId, meterType: type, year: period.year, month: period.month, previousReading: prev, currentReading: curr,
      ratePerUnit: rd && !rate ? rd.ratePerUnit : rate, fixedCharge: fixed || (rd?.fixedCharge ?? 0) }),
    onSuccess: () => { onSaved(); show('success', `Room ${r.roomName} saved`) },
    onError: (e) => show('error', 'Not saved', errMsg(e)),
  })
  const del = useMutation({ mutationFn: () => deleteMeterReading(rd.id), onSuccess: () => { onSaved(); setCurr('') }, onError: (e) => show('error', 'Not deleted', errMsg(e)) })
  const units = prev !== '' && curr !== '' ? Number(curr) - Number(prev) : null
  const changed = !rd || String(rd.previousReading) !== prev || String(rd.currentReading) !== curr
  const cls = 'w-24 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-right disabled:bg-gray-50'
  return (
    <tr className="border-t border-gray-50">
      <td className="px-4 py-2 font-semibold text-gray-700">{r.roomName}</td>
      <td className="px-2 py-2 text-center text-gray-500">{r.residents}</td>
      <td className="px-2 py-2 text-center"><input type="number" min={0} value={prev} disabled={billed} onChange={(e) => setPrev(e.target.value)} className={cls} aria-label="Previous reading" /></td>
      <td className="px-2 py-2 text-center"><input type="number" min={0} value={curr} disabled={billed} onChange={(e) => setCurr(e.target.value)} className={cls} aria-label="Current reading" /></td>
      <td className={`px-2 py-2 text-center ${units != null && units < 0 ? 'text-red-500' : 'text-gray-600'}`}>{units ?? '–'}</td>
      <td className="px-2 py-2 text-right font-semibold">{rd ? inr(rd.amount) : '–'}{billed && <span className="block text-[10px] font-medium text-emerald-600">Billed to {rd.residentsBilled}</span>}</td>
      <td className="px-2 py-2 text-right whitespace-nowrap">
        {!billed && changed && <button onClick={() => save.mutate()} disabled={prev === '' || curr === '' || (units ?? 0) < 0 || save.isPending} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 disabled:opacity-40">Save</button>}
        {!billed && rd && <button onClick={() => del.mutate()} aria-label="Delete reading" className="ml-1 text-gray-300 hover:text-red-500 align-middle"><Trash2 size={14} /></button>}
      </td>
    </tr>
  )
}
