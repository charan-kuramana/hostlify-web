import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X, ClipboardList, CheckCircle2, XCircle, RefreshCw, IndianRupee, Lock,
} from 'lucide-react'
import Badge from '../../components/ui/Badge'
import PageHeader from '../../components/ui/PageHeader'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import {
  getPendingAllocations,
  allocateBed,
  getBookingRequests,
  approveBookingRequest,
  rejectBookingRequest,
  reassignBookingRequest,
  getFloorsWithAvailability,
  getRoomsWithAvailability,
  getBedsByRoom,
} from '../../api/staff'

const STATUS_TABS = ['ALL', 'PENDING_APPROVAL', 'REASSIGNED', 'APPROVED', 'REJECTED'] as const
type StatusTab = typeof STATUS_TABS[number]

const PREF_CHIP: Record<string, string> = {
  AC:     'bg-sky-50 text-sky-700',
  'Non-AC': 'bg-gray-100 text-gray-600',
  Any:    'bg-emerald-50 text-emerald-700',
}

const AVATAR_COLORS = ['bg-brand-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500', 'bg-amber-500']

function getInitials(name: string) {
  return (name || '??').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Approve Modal ─────────────────────────────────────────────────────────────
function ApproveModal({ requestId, onClose, onSuccess }: { requestId: number; onClose: () => void; onSuccess: () => void }) {
  const [monthlyRent, setMonthlyRent] = useState('')
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [err, setErr] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      approveBookingRequest(requestId, {
        monthlyRent: Number(monthlyRent),
        advanceAmount: Number(advanceAmount || 0),
        advancePaymentMode: paymentMode, // the API reads advancePaymentMode
      }),
    onSuccess,
    onError: (e: any) => setErr(e?.response?.data?.message ?? 'Failed to approve.'),
  })

  function submit() {
    if (!(Number(monthlyRent) > 0)) { setErr('Monthly rent must be greater than 0.'); return }
    if (Number(advanceAmount || 0) < 0) { setErr('Advance amount cannot be negative.'); return }
    setErr(null)
    mutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <h2 className="font-bold text-gray-900">Approve Booking</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Monthly Rent (₹)</label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="number" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} placeholder="e.g. 8000"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Advance Amount (₹)</label>
            <div className="relative">
              <IndianRupee size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="number" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} placeholder="e.g. 16000"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payment Mode</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
        </div>
        {err && <p className="mt-3 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{err}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={mutation.isPending || !monthlyRent}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}>
            {mutation.isPending ? 'Approving...' : 'Confirm Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Reject Modal ──────────────────────────────────────────────────────────────
function RejectModal({ requestId, onClose, onSuccess }: { requestId: number; onClose: () => void; onSuccess: () => void }) {
  const [reason, setReason] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => rejectBookingRequest(requestId, reason),
    onSuccess,
    onError: (e: any) => setErr(e?.response?.data?.message ?? 'Failed to reject.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-red-500" />
            <h2 className="font-bold text-gray-900">Reject Booking</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rejection Reason</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
            placeholder="Provide a reason..."
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none" />
        </div>
        {err && <p className="mt-3 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{err}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !reason.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60">
            {mutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Reassign Modal ────────────────────────────────────────────────────────────
function ReassignModal({ hostelId, requestId, onClose, onSuccess }: { hostelId: number; requestId: number; onClose: () => void; onSuccess: () => void }) {
  const [selectedFloorId, setSelectedFloorId] = useState<number | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [selectedBedId, setSelectedBedId] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { data: floors = [] } = useQuery({ queryKey: ['floors-availability', hostelId], queryFn: () => getFloorsWithAvailability(hostelId) })
  const { data: rooms = [] } = useQuery({ queryKey: ['rooms-availability', selectedFloorId], queryFn: () => getRoomsWithAvailability(selectedFloorId!), enabled: !!selectedFloorId })
  const { data: beds = [] } = useQuery({ queryKey: ['beds', selectedRoomId], queryFn: () => getBedsByRoom(selectedRoomId!), enabled: !!selectedRoomId })

  const availableBeds = (beds as any[]).filter((b) => b.status === 'AVAILABLE')

  const mutation = useMutation({
    mutationFn: () => reassignBookingRequest(requestId, selectedBedId!),
    onSuccess,
    onError: (e: any) => setErr(e?.response?.data?.message ?? 'Failed to reassign.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} className="text-blue-500" />
            <h2 className="font-bold text-gray-900">Reassign Bed</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Floor</label>
            <select value={selectedFloorId ?? ''}
              onChange={(e) => { setSelectedFloorId(Number(e.target.value)); setSelectedRoomId(null); setSelectedBedId(null) }}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
              <option value="">Select floor...</option>
              {(floors as any[]).filter((f) => (f.availableBeds ?? 0) > 0).map((f: any) => (
                <option key={f.id} value={f.id}>{f.floorName ?? f.name}</option>
              ))}
            </select>
          </div>
          {selectedFloorId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Room</label>
              <select value={selectedRoomId ?? ''} onChange={(e) => { setSelectedRoomId(Number(e.target.value)); setSelectedBedId(null) }}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                <option value="">Select room...</option>
                {(rooms as any[]).filter((r) => (r.availableBeds ?? 0) > 0).map((r: any) => (
                  <option key={r.id} value={r.id}>{r.roomName ?? r.roomNumber}</option>
                ))}
              </select>
            </div>
          )}
          {selectedRoomId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bed</label>
              <select value={selectedBedId ?? ''} onChange={(e) => setSelectedBedId(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                <option value="">Select bed...</option>
                {availableBeds.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.bedName ?? b.bedNumber}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {err && <p className="mt-3 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{err}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !selectedBedId}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}>
            {mutation.isPending ? 'Reassigning...' : 'Confirm Reassign'}
          </button>
        </div>
      </div>
    </div>
  )
}

type ModalState =
  | { type: 'approve'; requestId: number }
  | { type: 'reject'; requestId: number }
  | { type: 'reassign'; requestId: number }
  | null

// ─── Direct Allocation (Pending PENDING status) ───────────────────────────────
function DirectAllocationsTab() {
  const { activeHostelId } = useAuthStore()
  const queryClient = useQueryClient()
  const { show } = useToastStore()
  const [selected, setSelected] = useState<any | null>(null)
  const [bedId, setBedId] = useState('')
  const [floorId, setFloorId] = useState<number | null>(null)
  const [roomId, setRoomId] = useState<number | null>(null)
  const [rent, setRent] = useState('')
  const [advance, setAdvance] = useState('')
  const [checkInDate, setCheckInDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [allocErr, setAllocErr] = useState<string | null>(null)

  const { data: floors = [] } = useQuery({
    queryKey: ['floors-availability', activeHostelId],
    queryFn: () => getFloorsWithAvailability(activeHostelId!),
    enabled: !!activeHostelId && !!selected,
  })
  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms-availability', floorId],
    queryFn: () => getRoomsWithAvailability(floorId!),
    enabled: !!floorId,
  })
  const { data: beds = [] } = useQuery({
    queryKey: ['beds', roomId],
    queryFn: () => getBedsByRoom(roomId!),
    enabled: !!roomId,
  })

  function openAllocate(p: any) {
    setSelected(p); setFloorId(null); setRoomId(null); setBedId(''); setRent(''); setAdvance(''); setAllocErr(null)
  }

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ['pendingAllocations', activeHostelId],
    queryFn: () => getPendingAllocations(activeHostelId!),
    enabled: !!activeHostelId,
  })

  const allocateMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => allocateBed(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingAllocations', activeHostelId] })
      queryClient.invalidateQueries({ queryKey: ['members', activeHostelId] })
      queryClient.invalidateQueries({ queryKey: ['floors-availability', activeHostelId] })
      queryClient.invalidateQueries({ queryKey: ['structure', activeHostelId] })
      queryClient.invalidateQueries({ queryKey: ['occupancy', activeHostelId] })
      queryClient.invalidateQueries({ queryKey: ['dues-pending', activeHostelId] })
      setSelected(null)
      setBedId('')
      show('success', 'Bed allocated', 'The applicant has been assigned a bed.')
    },
    onError: (e: any) => {
      setAllocErr(e?.response?.data?.message ?? 'Could not allocate bed. Please try again.')
    },
  })

  function handleAllocate(e: FormEvent) {
    e.preventDefault()
    if (!bedId) { setAllocErr('Select a bed.'); return }
    if (rent !== '' && !(Number(rent) > 0)) { setAllocErr('Monthly rent must be greater than 0.'); return }
    if (Number(advance || 0) < 0) { setAllocErr('Advance amount cannot be negative.'); return }
    setAllocErr(null)
    // API: hostellerAuthUserId (auth user, not profile id), bedId, checkInDate, monthlyRent (blank = hostel default)
    allocateMut.mutate({
      hostellerAuthUserId: selected.authUserId,
      bedId: Number(bedId),
      checkInDate,
      ...(rent !== '' ? { monthlyRent: Number(rent) } : {}),
      advanceAmount: Number(advance || 0),
    })
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <>
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <ClipboardList size={15} className="text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900">Allocate Bed</h3>
              </div>
              <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {getInitials(selected.applicantName ?? selected.name ?? '??')}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{selected.applicantName ?? selected.name}</p>
                  <p className="text-xs text-gray-500">{selected.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Phone</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">{selected.phone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Gender</p>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">{selected.gender ?? '—'}</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleAllocate} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Floor</label>
                  <select value={floorId ?? ''} onChange={(e) => { setFloorId(e.target.value ? Number(e.target.value) : null); setRoomId(null); setBedId('') }}
                    className="w-full px-2.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                    <option value="">Select…</option>
                    {(floors as any[]).filter((f) => (f.availableBeds ?? 0) > 0).map((f: any) => (
                      <option key={f.id} value={f.id}>{f.floorName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Room</label>
                  <select value={roomId ?? ''} disabled={!floorId} onChange={(e) => { setRoomId(e.target.value ? Number(e.target.value) : null); setBedId('') }}
                    className="w-full px-2.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50">
                    <option value="">Select…</option>
                    {(rooms as any[]).filter((r) => (r.availableBeds ?? 0) > 0).map((r: any) => (
                      <option key={r.id} value={r.id}>{r.roomName ?? r.roomNumber}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Bed</label>
                  <select required value={bedId} disabled={!roomId} onChange={(e) => { setBedId(e.target.value); setAllocErr(null) }}
                    className="w-full px-2.5 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50">
                    <option value="">Select…</option>
                    {(beds as any[]).filter((b) => b.status === 'AVAILABLE').map((b: any) => (
                      <option key={b.id} value={b.id}>{b.bedName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Rent (₹)</label>
                  <input type="number" min={1} value={rent} onChange={(e) => setRent(e.target.value)} placeholder="Default"
                    className="w-full px-2.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Advance (₹)</label>
                  <input type="number" min={0} value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="0"
                    className="w-full px-2.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Check-in</label>
                  <input type="date" required value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full px-2 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              </div>
              {allocErr && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{allocErr}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setSelected(null)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={allocateMut.isPending}
                  className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}>
                  {allocateMut.isPending ? 'Allocating…' : 'Allocate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Applicant</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Preference</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Applied</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pending.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                    <ClipboardList size={18} className="text-gray-300" />
                  </div>
                  <p className="font-semibold text-gray-400 text-sm">No pending allocations</p>
                </td></tr>
              )}
              {(pending as any[]).map((p: any, i: number) => (
                <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                        {getInitials(p.applicantName ?? p.name ?? '??')}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{p.applicantName ?? p.name}</p>
                        <p className="text-xs text-gray-400">{p.gender}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-gray-700 text-sm">{p.email}</p>
                    <p className="text-xs text-gray-400">{p.phone}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PREF_CHIP[p.roomPreference ?? p.preference ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                      {p.roomPreference ?? p.preference ?? 'Any'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                    {fmtDate(p.appliedAt ?? p.createdAt)}
                  </td>
                  <td className="px-5 py-3.5"><Badge status={p.status ?? 'PENDING'} /></td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => openAllocate(p)}
                      className="flex items-center gap-1.5 text-emerald-600 hover:text-white font-semibold text-xs border border-emerald-200 bg-emerald-50 hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-all">
                      Allocate Room
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ─── Booking Requests Tab ──────────────────────────────────────────────────────
function BookingRequestsTab() {
  const { activeHostelId } = useAuthStore()
  const queryClient = useQueryClient()
  const { show } = useToastStore()
  const [activeStatus, setActiveStatus] = useState<StatusTab>('ALL')
  const [modal, setModal] = useState<ModalState>(null)

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['booking-requests', activeHostelId, activeStatus],
    queryFn: () => getBookingRequests(activeHostelId!, activeStatus === 'ALL' ? undefined : activeStatus),
    enabled: !!activeHostelId,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['booking-requests', activeHostelId] })
    queryClient.invalidateQueries({ queryKey: ['pendingAllocations', activeHostelId] })
    queryClient.invalidateQueries({ queryKey: ['members', activeHostelId] })
    queryClient.invalidateQueries({ queryKey: ['floors-availability', activeHostelId] })
    queryClient.invalidateQueries({ queryKey: ['structure', activeHostelId] })
    queryClient.invalidateQueries({ queryKey: ['occupancy', activeHostelId] })
    queryClient.invalidateQueries({ queryKey: ['dues-pending', activeHostelId] })
    setModal(null)
  }

  function invalidateWithToast(type: 'approve' | 'reject' | 'reassign') {
    invalidate()
    if (type === 'approve') show('success', 'Booking approved', 'The booking request has been approved.')
    else if (type === 'reject') show('success', 'Booking rejected', 'The booking request has been rejected.')
    else show('success', 'Bed reassigned', 'The bed has been reassigned.')
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveStatus(tab)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeStatus === tab ? 'bg-brand-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600'}`}>
            {tab === 'ALL' ? 'All' : tab.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hosteller</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Bed / Room / Floor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Check-in</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Expires</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(requests as any[]).map((req: any) => (
                <tr key={req.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-800">{req.applicantName ?? `#${req.hostellerProfileId}`}</p>
                    {req.detailsLocked
                      ? <p className="text-[11px] text-amber-600 flex items-center gap-1"><Lock size={10} /> Details unlock after approval</p>
                      : (req.mobile && <p className="text-xs text-gray-400">{req.mobile}</p>)}
                  </td>
                  <td className="px-5 py-3.5">
                    {req.reassignedBedId ? (
                      <>
                        <p className="font-medium text-gray-800">{req.reassignedBedName ?? `Bed #${req.reassignedBedId}`} <span className="text-[11px] font-semibold text-blue-600">(reassigned)</span></p>
                        <p className="text-xs text-gray-400">{req.reassignedRoomName ?? ''}{req.reassignedFloorName ? ` · ${req.reassignedFloorName}` : ''}{!req.reassignedRoomName && <span className="line-through">{req.bedName} · {req.roomName}</span>}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-gray-800">{req.bedName ?? `Bed #${req.bedId}`}</p>
                        <p className="text-xs text-gray-400">{req.roomName ?? `Room #${req.roomId}`} · {req.floorName ?? `Floor #${req.floorId}`}</p>
                      </>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{req.checkInDate ? fmtDate(req.checkInDate) : '—'}</td>
                  <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{req.expiresAt ? fmtDate(req.expiresAt) : '—'}</td>
                  <td className="px-5 py-3.5"><Badge status={req.status} /></td>
                  <td className="px-5 py-3.5">
                    {/* A reassigned request is still awaiting approval */}
                    {req.status === 'PENDING_APPROVAL' || req.status === 'REASSIGNED' ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setModal({ type: 'approve', requestId: req.id })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                          <CheckCircle2 size={12} /> Approve
                        </button>
                        <button onClick={() => setModal({ type: 'reject', requestId: req.id })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">
                          <XCircle size={12} /> Reject
                        </button>
                        <button onClick={() => setModal({ type: 'reassign', requestId: req.id })}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors">
                          <RefreshCw size={12} /> Reassign
                        </button>
                      </div>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
              {(requests as any[]).length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
                    <ClipboardList size={18} className="text-gray-300" />
                  </div>
                  <p className="font-semibold text-gray-400 text-sm">No booking requests found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal?.type === 'approve' && (
        <ApproveModal requestId={modal.requestId} onClose={() => setModal(null)} onSuccess={() => invalidateWithToast('approve')} />
      )}
      {modal?.type === 'reject' && (
        <RejectModal requestId={modal.requestId} onClose={() => setModal(null)} onSuccess={() => invalidateWithToast('reject')} />
      )}
      {modal?.type === 'reassign' && activeHostelId && (
        <ReassignModal hostelId={activeHostelId} requestId={modal.requestId} onClose={() => setModal(null)} onSuccess={() => invalidateWithToast('reassign')} />
      )}
    </>
  )
}

// ─── Unified Page ──────────────────────────────────────────────────────────────
type MainTab = 'requests' | 'allocations'

export default function Allocations() {
  const [activeTab, setActiveTab] = useState<MainTab>('requests')

  return (
    <div className="space-y-6">
      <PageHeader title="Allocations" subtitle="Manage booking requests and direct bed allocations" />

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'requests', label: 'Pending Requests' },
          { key: 'allocations', label: 'Direct Allocations' },
        ] as { key: MainTab; label: string }[]).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'requests' ? (
        <BookingRequestsTab />
      ) : (
        <DirectAllocationsTab />
      )}
    </div>
  )
}
