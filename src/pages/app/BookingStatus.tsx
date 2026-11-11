import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  BedDouble,
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Compass,
  Wallet,
  ArrowRight,
} from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { getMyBookingRequest, cancelBookingRequest, getMyBooking, getHostelDetail, getRoomsWithAvailability } from '../../api/hosteller'
import { useToastStore } from '../../store/toastStore'

function inr(n: any) {
  const v = Number(n ?? 0)
  return '₹' + v.toLocaleString('en-IN')
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const CANCELLABLE_STATUSES = new Set(['PENDING_APPROVAL', 'REASSIGNED'])

type StepState = 'done' | 'active' | 'pending'

function StatusTimeline({ status }: { status: string }) {
  const steps: { key: string; label: string }[] = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'review', label: 'Under Review' },
    { key: 'decision', label: 'Decision' },
  ]

  function getState(stepKey: string): StepState {
    // REASSIGNED = staff moved the request to another bed; it still awaits final approval
    if (status === 'PENDING_APPROVAL' || status === 'REASSIGNED') {
      if (stepKey === 'submitted') return 'done'
      if (stepKey === 'review') return 'active'
      return 'pending'
    }
    if (status === 'APPROVED') {
      return 'done'
    }
    if (status === 'REJECTED' || status === 'EXPIRED' || status === 'CANCELLED') {
      if (stepKey === 'submitted') return 'done'
      if (stepKey === 'review') return 'done'
      return 'active'
    }
    return 'pending'
  }

  const stepColor: Record<StepState, string> = {
    done:    'bg-emerald-500 text-white',
    active:  'bg-brand-600 text-white ring-4 ring-brand-100',
    pending: 'bg-gray-100 text-gray-400',
  }
  const labelColor: Record<StepState, string> = {
    done:    'text-emerald-700 font-semibold',
    active:  'text-brand-700 font-bold',
    pending: 'text-gray-400',
  }

  return (
    <div className="flex items-center gap-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {steps.map((step, i) => {
        const state = getState(step.key)
        return (
          <div key={step.key} className="flex-1 flex items-center">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${stepColor[state]}`}>
                {state === 'done' ? <CheckCircle2 size={16} /> : i + 1}
              </div>
              <p className={`text-xs mt-1.5 text-center ${labelColor[state]}`}>{step.label}</p>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-full mx-1 rounded-full -mt-5 ${getState(steps[i + 1].key) !== 'pending' ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function BookingStatus() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { show } = useToastStore()

  const { data: request, isLoading, isError, error } = useQuery({
    queryKey: ['my-booking-request'],
    queryFn: getMyBookingRequest,
    retry: (count, err: any) => {
      if (err?.response?.status === 404) return false
      return count < 2
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelBookingRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-booking-request'] })
      queryClient.invalidateQueries({ queryKey: ['floors-availability'] })
      queryClient.invalidateQueries({ queryKey: ['rooms-availability'] })
      show('success', 'Request cancelled', 'Your bed has been released.')
    },
    onError: (e: any) => {
      if (![400, 409].includes(e?.response?.status)) show('error', 'Could not cancel', 'Please try again.')
    },
  })

  // The request only carries ids — resolve hostel / room / bed names for display.
  const { data: reqHostel } = useQuery({
    queryKey: ['hostel-detail', request?.hostelId],
    queryFn: () => getHostelDetail(request!.hostelId),
    enabled: !!request?.hostelId,
  })
  const { data: reqRooms } = useQuery({
    queryKey: ['rooms-availability', request?.floorId],
    queryFn: () => getRoomsWithAvailability(request!.floorId),
    enabled: !!request?.floorId,
  })

  // Once approved, load the confirmed booking to show rent / advance / next due.
  const { data: booking } = useQuery({
    queryKey: ['my-active-booking'],
    queryFn: getMyBooking,
    enabled: request?.status === 'APPROVED',
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
      </div>
    )
  }

  const is404 = isError && (error as any)?.response?.status === 404
  const noRequest = is404 || !request

  if (noRequest) {
    return (
      <div className="space-y-6">
        <PageHeader title="Booking Status" subtitle="Track your booking request" />
        <div className="flex flex-col items-center gap-5 py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-50 to-blue-100 border border-brand-100 flex items-center justify-center">
            <BedDouble size={34} className="text-brand-300" />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg">No booking request yet</p>
            <p className="text-sm text-gray-400 mt-1.5 max-w-xs mx-auto">
              Discover available hostels and submit a booking request to get started.
            </p>
          </div>
          <button
            onClick={() => navigate('/app/discover')}
            className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
          >
            <Compass size={16} /> Find a Hostel
          </button>
        </div>
      </div>
    )
  }

  const status: string = request.status ?? 'PENDING_APPROVAL'
  const effectiveBedId = request.reassignedBedId ?? request.bedId
  const allBeds = ((reqRooms ?? []) as any[]).flatMap((r: any) => (r.beds ?? []).map((b: any) => ({ ...b, roomName: r.roomName })))
  const reqBed = allBeds.find((b: any) => b.id === effectiveBedId)
  const reqRoomName = reqBed?.roomName ?? ((reqRooms ?? []) as any[]).find((r: any) => (r.id ?? r.roomId) === request.roomId)?.roomName

  const STATUS_BADGE_CLS: Record<string, string> = {
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-200',
    APPROVED:         'bg-emerald-100 text-emerald-800 border-emerald-200',
    REJECTED:         'bg-red-100 text-red-800 border-red-200',
    REASSIGNED:       'bg-blue-100 text-blue-800 border-blue-200',
    EXPIRED:          'bg-gray-100 text-gray-700 border-gray-200',
    CANCELLED:        'bg-gray-100 text-gray-700 border-gray-200',
  }
  const badgeCls = STATUS_BADGE_CLS[status] ?? 'bg-gray-100 text-gray-700 border-gray-200'

  // Countdown
  let countdown: string | null = null
  if (request.expiresAt && status === 'PENDING_APPROVAL') {
    const ms = new Date(request.expiresAt).getTime() - Date.now()
    if (ms > 0) {
      const days = Math.floor(ms / 86400000)
      const hours = Math.floor((ms % 86400000) / 3600000)
      countdown = days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`
    }
  }

  return (
    <div className="space-y-5 max-w-xl">
      <PageHeader title="Booking Status" subtitle="Track your current booking request" />

      {/* Large status badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold ${badgeCls}`}>
        {status === 'PENDING_APPROVAL' && <Clock size={16} />}
        {status === 'APPROVED'         && <CheckCircle2 size={16} />}
        {status === 'REJECTED'         && <XCircle size={16} />}
        {status === 'REASSIGNED'       && <RefreshCw size={16} />}
        {!['PENDING_APPROVAL','APPROVED','REJECTED','REASSIGNED'].includes(status) && <Clock size={16} />}
        {status.replace(/_/g, ' ')}
      </div>

      {/* Timeline stepper */}
      <StatusTimeline status={status} />

      {/* APPROVED — confirmation + payment summary + CTA */}
      {status === 'APPROVED' && (() => {
        const rent = booking?.rentAmount ?? 0
        const advance = booking?.advanceAmount ?? 0
        const checkin = booking?.checkinDate ? new Date(booking.checkinDate) : null
        const nextDue = checkin ? new Date(checkin.getFullYear(), checkin.getMonth() + 1, 1) : null
        return (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-5 py-4 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
              <p className="text-sm font-semibold text-emerald-800">Your booking is approved and your bed is confirmed. Complete your payment to finish moving in.</p>
            </div>

            <div className="rounded-2xl border border-brand-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 brand-gradient text-white flex items-center gap-2">
                <Wallet size={18} />
                <h3 className="font-bold text-sm">Payment Summary</h3>
              </div>
              <div className="bg-white divide-y divide-gray-50 text-sm">
                <div className="flex justify-between px-5 py-3">
                  <span className="text-gray-500 font-medium">Monthly Rent</span>
                  <span className="font-bold text-gray-900">{inr(rent)}</span>
                </div>
                <div className="flex justify-between px-5 py-3">
                  <span className="text-gray-500 font-medium">Advance / Deposit</span>
                  <span className="font-bold text-gray-900">{inr(advance)}</span>
                </div>
                <div className="flex justify-between px-5 py-3">
                  <span className="text-gray-500 font-medium">Move-in Date</span>
                  <span className="font-semibold text-gray-800">{checkin ? fmtDate(checkin.toISOString()) : '—'}</span>
                </div>
                <div className="flex justify-between px-5 py-3">
                  <span className="text-gray-500 font-medium">Next Month Due</span>
                  <span className="font-semibold text-gray-800">{nextDue ? fmtDate(nextDue.toISOString()) : '—'}</span>
                </div>
                <div className="flex justify-between px-5 py-3.5 bg-brand-50/60">
                  <span className="text-brand-700 font-bold">First Month Rent · due now</span>
                  <span className="font-extrabold text-brand-700 text-base">{inr(rent)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/app/dues')}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 brand-gradient"
            >
              Proceed to Payment <ArrowRight size={16} />
            </button>
          </div>
        )
      })()}

      {status === 'REASSIGNED' && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 flex items-start gap-3">
          <RefreshCw size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-blue-800">
            The hostel has moved your request to {reqBed ? `${reqRoomName} · ${reqBed.bedName}` : 'a different bed'}. It will be confirmed once they approve it — cancel below if this bed doesn't suit you.
          </p>
        </div>
      )}

      {/* Expiry countdown */}
      {countdown && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-3 flex items-center gap-2 text-sm text-amber-800 font-semibold">
          <Clock size={15} />
          {countdown} — the hostel must respond before the request auto-expires
        </div>
      )}

      {/* Bed details card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 text-sm">
        {[
          { label: 'Hostel', value: request.hostelName ?? reqHostel?.name ?? (request.hostelId ? `Hostel #${request.hostelId}` : '—'), icon: Building2 },
          { label: 'Bed', value: request.bedInfo ?? (reqBed ? `${reqRoomName} · ${reqBed.bedName}` : effectiveBedId ? `Bed #${effectiveBedId}` : '—'), icon: BedDouble },
          { label: 'Check-in', value: request.checkInDate ? fmtDate(request.checkInDate) : '—', icon: CalendarDays },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-3 px-5 py-3.5">
            <Icon size={14} className="text-gray-300 shrink-0" />
            <span className="text-gray-400 w-24 shrink-0 font-medium">{label}</span>
            <span className="font-semibold text-gray-800">{value}</span>
          </div>
        ))}
        {request.expiresAt && status === 'PENDING_APPROVAL' && (
          <div className="flex items-center gap-3 px-5 py-3.5">
            <Clock size={14} className="text-gray-300 shrink-0" />
            <span className="text-gray-400 w-24 shrink-0 font-medium">Expires</span>
            <span className="font-semibold text-gray-800">{fmtDate(request.expiresAt)}</span>
          </div>
        )}
      </div>

      {/* Rejection reason */}
      {status === 'REJECTED' && request.rejectionReason && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">Rejection Reason</p>
          <p className="text-sm text-red-700">{request.rejectionReason}</p>
        </div>
      )}

      {['REJECTED', 'CANCELLED', 'EXPIRED'].includes(status) && (
        <button
          onClick={() => navigate('/app/discover')}
          className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 brand-gradient"
        >
          <Compass size={16} /> Find another bed
        </button>
      )}

      {/* Cancel button */}
      {CANCELLABLE_STATUSES.has(status) && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => { if (window.confirm('Cancel this booking request? Your reserved bed will be released.')) cancelMutation.mutate(request.id) }}
            disabled={cancelMutation.isPending}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Request'}
          </button>
          {cancelMutation.isSuccess && (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">Request cancelled.</p>
              <button
                onClick={() => navigate('/app/discover')}
                className="text-sm text-brand-600 font-semibold hover:underline flex items-center gap-1.5 mx-auto"
              >
                <Compass size={14} /> Discover other hostels
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
