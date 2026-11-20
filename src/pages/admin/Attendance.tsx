import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { inr, MONTHS } from '../../lib/payments'
import { addDays, errMsg, getAttendanceDay, getAttendanceMonth, saveAttendance, todayIST } from '../../api/ops'

const STATUSES = [
  ['PRESENT', 'Present', 'bg-emerald-600 text-white', 'P'],
  ['HALF_DAY', 'Half day', 'bg-amber-500 text-white', '½'],
  ['ABSENT', 'Absent', 'bg-red-500 text-white', 'A'],
  ['LEAVE', 'Leave', 'bg-purple-500 text-white', 'L'],
  ['WEEK_OFF', 'Week off', 'bg-gray-500 text-white', 'W'],
] as const
const SHORT = Object.fromEntries(STATUSES.map(([k, , c, s]) => [k, [s, c]])) as Record<string, [string, string]>

export default function Attendance() {
  const { activeHostelId, subRole } = useAuthStore()
  const canMark = !subRole || ['OWNER', 'ADMIN', 'MANAGER'].includes(subRole)
  const [view, setView] = useState<'day' | 'month'>('day')
  return (
    <div>
      <PageHeader title="Staff attendance" subtitle="Daily attendance for cooks, cleaners, guards and other employees. Absences feed the salary suggestion." />
      <div className="flex gap-1 mb-4">
        {(['day', 'month'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`px-3.5 py-2 rounded-xl text-sm font-semibold ${view === v ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>{v === 'day' ? 'Mark today' : 'Month summary'}</button>
        ))}
      </div>
      {activeHostelId && (view === 'day' ? <DayView hostelId={activeHostelId} canMark={canMark} /> : <MonthView hostelId={activeHostelId} />)}
    </div>
  )
}

function DayView({ hostelId, canMark }: { hostelId: number; canMark: boolean }) {
  const [date, setDate] = useState(todayIST())
  const { data = [], isLoading, dataUpdatedAt } = useQuery({ queryKey: ['attendance', hostelId, date], queryFn: () => getAttendanceDay(hostelId, date) })
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setDate(addDays(date, -1))} aria-label="Previous day" className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center"><ChevronLeft size={16} /></button>
        <input type="date" value={date} max={todayIST()} onChange={(e) => e.target.value && setDate(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white" />
        <button onClick={() => date < todayIST() && setDate(addDays(date, 1))} disabled={date >= todayIST()} aria-label="Next day" className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
      {isLoading ? <p className="text-sm text-gray-400">Loading…</p> : <DayEditor key={date + dataUpdatedAt} hostelId={hostelId} date={date} data={data as any[]} canMark={canMark} />}
    </div>
  )
}

function DayEditor({ hostelId, date, data, canMark }: { hostelId: number; date: string; data: any[]; canMark: boolean }) {
  const qc = useQueryClient()
  const { show } = useToastStore()
  const [rows, setRows] = useState<any[]>(() => data.map((r) => ({ ...r, inTime: r.inTime?.slice(0, 5) ?? '', outTime: r.outTime?.slice(0, 5) ?? '' })))
  const dirty = JSON.stringify(rows.map((r) => [r.status, r.inTime, r.outTime])) !== JSON.stringify((data as any[]).map((r) => [r.status, r.inTime?.slice(0, 5) ?? '', r.outTime?.slice(0, 5) ?? '']))
  const mut = useMutation({
    mutationFn: () => saveAttendance(hostelId, date, rows.map((r) => ({ employeeId: r.employeeId, status: r.status, inTime: r.inTime || null, outTime: r.outTime || null }))),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance', hostelId] }); show('success', 'Attendance saved') },
    onError: (e) => show('error', 'Not saved', errMsg(e)),
  })
  const set = (i: number, patch: any) => setRows((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  return (
    <div className="space-y-3">
      {canMark && rows.length > 0 && <button onClick={() => setRows((xs) => xs.map((x) => ({ ...x, status: x.status ?? 'PRESENT' })))} className="text-xs font-semibold text-brand-600">Mark everyone unmarked as present</button>}
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-sm text-gray-400"><CalendarCheck className="mx-auto mb-2 text-gray-300" />No employees yet. Add them under Staff & Employees.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {rows.map((r, i) => (
            <div key={r.employeeId} className="px-4 py-3 flex items-center gap-3 flex-wrap">
              <div className="min-w-[10rem] flex-1"><p className="font-semibold text-sm text-gray-800">{r.name}</p><p className="text-xs text-gray-400">{r.role}</p></div>
              <div className="flex gap-1 flex-wrap">
                {STATUSES.map(([k, l, c]) => (
                  <button key={k} disabled={!canMark} onClick={() => set(i, { status: r.status === k ? null : k })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${r.status === k ? c + ' border-transparent' : 'border-gray-200 text-gray-500 bg-white'}`}>{l}</button>
                ))}
              </div>
              {(r.status === 'PRESENT' || r.status === 'HALF_DAY') && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <input type="time" value={r.inTime} disabled={!canMark} onChange={(e) => set(i, { inTime: e.target.value })} aria-label="In time" className="px-2 py-1 rounded-lg border border-gray-200" />
                  <span>to</span>
                  <input type="time" value={r.outTime} disabled={!canMark} onChange={(e) => set(i, { outTime: e.target.value })} aria-label="Out time" className="px-2 py-1 rounded-lg border border-gray-200" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {canMark ? rows.length > 0 && (
        <button onClick={() => mut.mutate()} disabled={!dirty || mut.isPending} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold brand-gradient disabled:opacity-50">{mut.isPending ? 'Saving…' : 'Save attendance'}</button>
      ) : <p className="text-xs text-gray-500">Only the owner, admin or manager can mark attendance.</p>}
    </div>
  )
}

function MonthView({ hostelId }: { hostelId: number }) {
  const t = todayIST()
  const [p, setP] = useState({ year: +t.slice(0, 4), month: +t.slice(5, 7) })
  const { data, isLoading } = useQuery({ queryKey: ['attendance-month', hostelId, p], queryFn: () => getAttendanceMonth(hostelId, p.year, p.month) })
  const shift = (n: number) => { const d = new Date(Date.UTC(p.year, p.month - 1 + n, 1)); setP({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }) }
  const days = data ? Array.from({ length: data.daysInMonth }, (_, i) => `${p.year}-${String(p.month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`) : []
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => shift(-1)} aria-label="Previous month" className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center"><ChevronLeft size={16} /></button>
        <span className="font-semibold text-gray-800 w-24 text-center">{MONTHS[p.month]} {p.year}</span>
        <button onClick={() => shift(1)} aria-label="Next month" className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center"><ChevronRight size={16} /></button>
      </div>
      {isLoading || !data ? <p className="text-sm text-gray-400">Loading…</p> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="text-xs w-full">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-3 py-2 sticky left-0 bg-gray-50">Employee</th>
                {days.map((d) => <th key={d} className="px-1 py-2 font-medium">{+d.slice(8)}</th>)}
                <th className="px-3 py-2">Paid days</th><th className="px-3 py-2">Absent</th><th className="px-3 py-2 text-right">Suggested deduction</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((e: any) => (
                <tr key={e.employeeId} className="border-t border-gray-50">
                  <td className="px-3 py-2 sticky left-0 bg-white font-semibold text-gray-700 whitespace-nowrap">{e.name}</td>
                  {days.map((d) => {
                    const s = e.days[d]
                    return <td key={d} className="px-0.5 py-1 text-center">{s ? <span className={`inline-block w-5 h-5 leading-5 rounded ${SHORT[s][1]}`}>{SHORT[s][0]}</span> : <span className="text-gray-200">·</span>}</td>
                  })}
                  <td className="px-3 py-2 text-center">{e.paidDays}</td>
                  <td className="px-3 py-2 text-center">{e.absentDays}</td>
                  <td className="px-3 py-2 text-right font-semibold">{inr(e.suggestedDeduction)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-gray-400 px-3 py-2 border-t border-gray-50">Unmarked days count as paid. Deduction = monthly salary ÷ days in month × absent days (half day = ½). It's prefilled when you record the salary under Staff & Employees.</p>
        </div>
      )}
    </div>
  )
}
