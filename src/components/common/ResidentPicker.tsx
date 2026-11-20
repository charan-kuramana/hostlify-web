import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMembers } from '../../api/staff'

const memberName =(m: any) => m?.name ?? `${m?.firstName ?? ''} ${m?.lastName ?? ''}`.trim()

/** Searchable resident dropdown for the active hostel. */
export default function ResidentPicker({ hostelId, value, onChange, optional }: {
  hostelId: number; value: number | null; onChange: (id: number | null) => void; optional?: string
}) {
  const [q, setQ] = useState('')
  const { data: members = [] } = useQuery({ queryKey: ['members', hostelId], queryFn: () => getMembers(hostelId) })
  const active = useMemo(() => (members as any[]).filter((m) => !m.status || ['ACTIVE', 'ALLOCATED'].includes(m.status) || m.hostelId === hostelId), [members, hostelId])
  const list = active.filter((m) => !q || memberName(m).toLowerCase().includes(q.toLowerCase()) || String(m.mobile ?? '').includes(q))
  const cls = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400'
  return (
    <div className="space-y-1.5">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search resident by name or mobile" className={cls} />
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} className={cls} aria-label="Resident">
        <option value="">{optional ?? 'Choose resident'}</option>
        {list.map((m) => <option key={m.id} value={m.id}>{memberName(m)}{m.mobile ? ` · ${m.mobile}` : ''}</option>)}
      </select>
    </div>
  )
}
