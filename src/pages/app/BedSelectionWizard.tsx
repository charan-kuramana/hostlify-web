import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BedDouble, Layers, DoorOpen, CheckCircle2, CalendarDays, AlignLeft, Lock, ArrowRight } from 'lucide-react'
import {
  getHostelDetail,
  getFloorsWithAvailability,
  getRoomsWithAvailability,
  submitBookingRequest,
  getMyBookingRequest,
  retryUnless404,
} from '../../api/hosteller'

const STEPS = ['Floor', 'Pick a Bed', 'Confirm'] as const
type Step = 0 | 1 | 2

// AVAILABLE → green (selectable) · RESERVED → yellow (allocated & waiting) · OCCUPIED → red (staying)
type BedStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED'
const SEAT: Record<BedStatus, { label: string; cls: string; dot: string; selectable: boolean }> = {
  AVAILABLE: { label: 'Available', cls: 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 hover:-translate-y-0.5 cursor-pointer', dot: 'bg-emerald-500', selectable: true },
  RESERVED:  { label: 'Allocated · Waiting', cls: 'bg-amber-50 border-amber-300 text-amber-600 cursor-not-allowed', dot: 'bg-amber-400', selectable: false },
  OCCUPIED:  { label: 'Occupied', cls: 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed', dot: 'bg-red-500', selectable: false },
}
const seatUi = (s: string) => SEAT[(s as BedStatus)] ?? SEAT.OCCUPIED

function inr(n: any) { return '₹' + Number(n ?? 0).toLocaleString('en-IN') }

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )
}

function Stepper({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                done ? 'bg-brand-600 border-brand-600 text-white' : active ? 'bg-white border-brand-600 text-brand-700' : 'bg-white border-gray-200 text-gray-400'
              }`}>
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-xs mt-1 font-semibold whitespace-nowrap ${active ? 'text-brand-700' : done ? 'text-brand-500' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 mb-5 transition-all ${i < current ? 'bg-brand-500' : 'bg-gray-200'}`} />}
          </div>
        )
      })}
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {(['AVAILABLE', 'RESERVED', 'OCCUPIED'] as BedStatus[]).map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <span className={`w-3.5 h-3.5 rounded ${SEAT[s].dot}`} />
          <span className="text-xs font-medium text-gray-600">{SEAT[s].label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span className="w-3.5 h-3.5 rounded bg-brand-600" />
        <span className="text-xs font-medium text-gray-600">Your pick</span>
      </div>
    </div>
  )
}

// A single bed rendered as a "seat"
function Seat({ bed, selected, onSelect }: { bed: any; selected: boolean; onSelect: (b: any) => void }) {
  const ui = seatUi(bed.status)
  return (
    <button
      disabled={!ui.selectable}
      onClick={() => ui.selectable && onSelect(bed)}
      title={`${bed.bedName} · ${ui.label}`}
      className={`relative w-[58px] h-[52px] rounded-t-xl rounded-b-md border-2 flex flex-col items-center justify-center gap-0.5 transition-all ${
        selected ? 'bg-brand-600 border-brand-700 text-white shadow-md -translate-y-0.5' : ui.cls
      }`}
    >
      <span className={`absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1.5 rounded-full ${selected ? 'bg-brand-700' : ui.dot} opacity-70`} />
      <BedDouble size={16} className="mt-1" />
      <span className="text-[10px] font-bold leading-none">{(bed.bedName ?? '').replace(/^Bed\s*/i, '')}</span>
      {!ui.selectable && <Lock size={9} className="absolute top-1 right-1 opacity-50" />}
      {selected && <CheckCircle2 size={11} className="absolute top-1 right-1" />}
    </button>
  )
}

// ─── Step 1: Floor ────────────────────────────────────────────────────────────
function FloorStep({ hostelId, onSelect }: { hostelId: number; onSelect: (f: any) => void }) {
  const { data: floors = [], isLoading } = useQuery({
    queryKey: ['floors-availability', hostelId],
    queryFn: () => getFloorsWithAvailability(hostelId),
    enabled: !!hostelId,
  })
  if (isLoading) return <Spinner />
  if ((floors as any[]).length === 0)
    return <div className="flex flex-col items-center gap-2 py-12 text-center"><Layers size={32} className="text-gray-200" /><p className="text-sm text-gray-400 font-medium">No floors configured yet</p></div>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {(floors as any[]).map((floor: any) => {
        const free = floor.availableBeds ?? 0
        const full = free === 0
        return (
          <button key={floor.id ?? floor.floorId} onClick={() => onSelect(floor)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left flex items-center gap-4 hover:border-brand-300 hover:shadow-md transition-all group">
            <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
              <Layers size={20} className="text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{floor.floorName ?? floor.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{free} / {floor.totalBeds} beds available</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${full ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>{full ? 'Full' : `${free} free`}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Step 2: Seat map (all rooms + beds on the floor) ──────────────────────────
function SeatMapStep({ floorId, selectedBed, onSelect }: { floorId: number; selectedBed: any; onSelect: (b: any, room: any) => void }) {
  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms-availability', floorId],
    queryFn: () => getRoomsWithAvailability(floorId),
    enabled: !!floorId,
  })
  if (isLoading) return <Spinner />
  if ((rooms as any[]).length === 0)
    return <div className="flex flex-col items-center gap-2 py-12 text-center"><DoorOpen size={32} className="text-gray-200" /><p className="text-sm text-gray-400 font-medium">No rooms on this floor yet</p></div>

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"><Legend /></div>

      {/* "Entrance" marker for orientation, like a seat-map screen/door */}
      <div className="flex justify-center">
        <div className="px-6 py-1.5 rounded-full bg-gray-100 text-gray-400 text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5">
          <DoorOpen size={13} /> Floor Entrance
        </div>
      </div>

      <div className="space-y-3">
        {(rooms as any[]).map((room: any) => {
          const beds = room.beds ?? []
          const free = room.availableBeds ?? 0
          return (
            <div key={room.id ?? room.roomId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg tracking-wider whitespace-nowrap">{room.roomName ?? room.roomNumber}</span>
                  {room.roomType && <span className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{room.roomType}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {room.rentAmount != null && <span className="text-xs font-bold text-brand-600">{inr(room.rentAmount)}/mo</span>}
                  <span className={`text-[11px] font-semibold ${free === 0 ? 'text-red-500' : 'text-emerald-600'}`}>{free === 0 ? 'Full' : `${free} free`}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {beds.map((bed: any) => (
                  <Seat key={bed.id} bed={bed} selected={selectedBed?.id === bed.id} onSelect={(b) => onSelect(b, room)} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 3: Confirm ──────────────────────────────────────────────────────────
function ConfirmStep({ hostelId, hostelName, selectedFloor, selectedRoom, selectedBed, onSuccess }: {
  hostelId: number; hostelName: string; selectedFloor: any; selectedRoom: any; selectedBed: any; onSuccess: () => void
}) {
  const today = new Date().toLocaleDateString('en-CA') // local YYYY-MM-DD (toISOString is UTC → "yesterday" before 5:30am IST)
  const [checkInDate, setCheckInDate] = useState(today)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // A new request replaces any pending one (the old bed is released) — warn before that happens.
  const { data: myRequest } = useQuery({ queryKey: ['my-booking-request'], queryFn: getMyBookingRequest, retry: retryUnless404 })
  const replacesPending = myRequest?.status === 'PENDING_APPROVAL' || myRequest?.status === 'REASSIGNED'

  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => {
      if (!checkInDate || checkInDate < today) return Promise.reject({ response: { data: { message: 'Check-in date cannot be in the past.' } } })
      return submitBookingRequest({ hostelId, bedId: selectedBed.id, checkInDate, preferenceNotes: notes.trim() || undefined })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-booking-request'] })
      queryClient.invalidateQueries({ queryKey: ['floors-availability'] })
      queryClient.invalidateQueries({ queryKey: ['rooms-availability'] })
      onSuccess()
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to submit booking request. Please try again.'),
  })

  return (
    <div className="space-y-5 max-w-xl">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm">Booking Summary</h3>
        <div className="divide-y divide-gray-50 text-sm">
          {[
            { label: 'Hostel', value: hostelName },
            { label: 'Floor', value: selectedFloor.floorName ?? selectedFloor.name },
            { label: 'Room', value: selectedRoom.roomName ?? selectedRoom.roomNumber },
            { label: 'Bed', value: selectedBed.bedName ?? selectedBed.bedNumber },
            ...(selectedRoom.rentAmount != null ? [{ label: 'Monthly Rent', value: inr(selectedRoom.rentAmount) }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2.5">
              <span className="text-gray-400 font-medium">{label}</span>
              <span className="font-semibold text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-2"><span className="flex items-center gap-1.5"><CalendarDays size={14} /> Check-in Date</span></label>
        <input type="date" value={checkInDate} min={today} onChange={(e) => setCheckInDate(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <label className="block text-sm font-semibold text-gray-700 mb-2"><span className="flex items-center gap-1.5"><AlignLeft size={14} /> Preference Notes <span className="font-normal text-gray-400">(optional)</span></span></label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} placeholder="Any preferences or special requirements..."
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 resize-none" />
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-500 bg-brand-50/60 px-4 py-3 rounded-xl">
        <Lock size={13} className="mt-0.5 shrink-0 text-brand-500" />
        <span>Submitting reserves this bed for you (shown as <span className="font-semibold text-amber-600">Allocated · Waiting</span> to others) until staff confirm your booking. You'll then be asked to pay.</span>
      </div>

      {replacesPending && (
        <p className="text-sm text-amber-800 font-medium bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
          You already have a pending booking request. Submitting this one will cancel it and release that bed.
        </p>
      )}

      {error && <p className="text-sm text-red-500 font-medium bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

      <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 brand-gradient">
        {mutation.isPending ? 'Submitting...' : replacesPending ? 'Replace My Pending Request' : 'Submit Booking Request'}
      </button>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function BedSelectionWizard() {
  const { hostelId } = useParams<{ hostelId: string }>()
  const navigate = useNavigate()
  const id = Number(hostelId)

  const [step, setStep] = useState<Step>(0)
  const [selectedFloor, setSelectedFloor] = useState<any>(null)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [selectedBed, setSelectedBed] = useState<any>(null)

  const { data: hostel } = useQuery({ queryKey: ['hostel-detail', id], queryFn: () => getHostelDetail(id), enabled: !!id })
  const hostelName = hostel?.name ?? hostel?.hostelName ?? `Hostel #${hostelId}`

  const floorId = selectedFloor?.id ?? selectedFloor?.floorId

  function handleBack() {
    if (step === 0) { navigate(-1); return }
    if (step === 1) setSelectedBed(null)
    setStep((s) => (s - 1) as Step)
  }

  return (
    <div className="space-y-5">
      <button onClick={handleBack} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft size={16} /> {step === 0 ? 'Back to Hostel' : 'Previous Step'}
      </button>

      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Book a Bed</h1>
        <p className="text-sm text-gray-500 mt-0.5">{hostelName} · {step === 0 ? 'choose a floor' : step === 1 ? 'tap an available bed' : 'review & confirm'}</p>
      </div>

      <Stepper current={step} />

      {step === 0 && <FloorStep hostelId={id} onSelect={(f) => { setSelectedFloor(f); setSelectedRoom(null); setSelectedBed(null); setStep(1) }} />}

      {step === 1 && selectedFloor && (
        <>
          <SeatMapStep floorId={floorId} selectedBed={selectedBed} onSelect={(b, room) => { setSelectedBed(b); setSelectedRoom(room) }} />
          {selectedBed && (
            <div className="sticky bottom-16 lg:bottom-0 z-30">
              <div className="bg-white border border-gray-200 shadow-lg rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center text-white shrink-0"><BedDouble size={18} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{selectedRoom?.roomName} · {selectedBed.bedName}</p>
                  <p className="text-xs text-gray-500">{selectedRoom?.rentAmount != null ? `${inr(selectedRoom.rentAmount)}/mo` : 'Selected'}</p>
                </div>
                <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 brand-gradient hover:opacity-90 transition-opacity">
                  Continue <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {step === 2 && selectedFloor && selectedRoom && selectedBed && (
        <ConfirmStep hostelId={id} hostelName={hostelName} selectedFloor={selectedFloor} selectedRoom={selectedRoom} selectedBed={selectedBed}
          onSuccess={() => navigate('/app/booking-status')} />
      )}
    </div>
  )
}
