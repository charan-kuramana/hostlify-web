import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, Home, Building2, Bell, ChevronRight, UtensilsCrossed, Megaphone, Wrench, Gift, CalendarClock, AlertCircle, UserCheck, Compass } from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import { useAuthStore } from '../../store/authStore'
import { getMyStay, getHostellerProfile, getCurrentDue, getAnnouncements, getProfileCompletion, retryUnless404, isNotFound } from '../../api/hosteller'
import ReviewCard from './ReviewCard'

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const CATEGORY_DOT: Record<string, string> = {
  Event: 'bg-purple-400',
  Maintenance: 'bg-amber-400',
  Fee: 'bg-red-400',
  General: 'bg-blue-400',
}

const QUICK_LINKS = [
  { label: 'My Dues',    to: '/app/dues',       icon: CreditCard,      bg: 'bg-brand-50',  iconColor: 'text-brand-600',  border: 'border-brand-100' },
  { label: 'Complaints', to: '/app/complaints', icon: AlertCircle,     bg: 'bg-amber-50',   iconColor: 'text-amber-600',   border: 'border-amber-100' },
  { label: 'Leave',      to: '/app/leave',      icon: CalendarClock,   bg: 'bg-rose-50',    iconColor: 'text-rose-600',    border: 'border-rose-100' },
  { label: 'Menu',       to: '/app/menu',       icon: UtensilsCrossed, bg: 'bg-emerald-50', iconColor: 'text-emerald-600', border: 'border-emerald-100' },
  { label: 'Service',    to: '/app/service',    icon: Wrench,          bg: 'bg-sky-50',     iconColor: 'text-sky-600',     border: 'border-sky-100' },
  { label: 'Referral',   to: '/app/referral',   icon: Gift,            bg: 'bg-violet-50',  iconColor: 'text-violet-600',  border: 'border-violet-100' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { hostelId, hostellerProfileId, email } = useAuthStore()

  const { data: booking, error: bookingError, isLoading: bookingLoading } = useQuery({
    queryKey: ['my-booking'],
    queryFn: getMyStay,
    retry: retryUnless404,
  })
  // 404 = registered but no approved booking yet (pending hosteller)
  const noStay = !bookingLoading && !booking && isNotFound(bookingError)

  const { data: profile } = useQuery({
    queryKey: ['profile', hostellerProfileId],
    queryFn: () => getHostellerProfile(hostellerProfileId!),
    enabled: !!hostellerProfileId,
  })

  const { data: currentDue } = useQuery({
    queryKey: ['current-due'],
    queryFn: getCurrentDue,
    retry: retryUnless404,
  })

  const { data: announcements } = useQuery({
    queryKey: ['announcements', hostelId],
    queryFn: () => getAnnouncements(hostelId!),
    enabled: !!hostelId,
  })

  const { data: profileCompletion } = useQuery({
    queryKey: ['profile-completion'],
    queryFn: getProfileCompletion,
    enabled: !!hostellerProfileId,
  })

  const displayName = profile?.name ?? email ?? '...'
  const roomNumber = booking?.roomName ?? profile?.roomNumber ?? (booking ? '—' : '...')
  const hostelName = booking?.hostelName ?? (booking ? '—' : '...')
  const joinDate = booking?.checkinDate ? fmtDate(booking.checkinDate) : '...'

  const dueOpen = currentDue && currentDue.status !== 'PAID'
  const dueAmount = dueOpen && currentDue.amount != null ? `₹${Number(currentDue.amount).toLocaleString('en-IN')}` : '—'
  const dueDateStr = dueOpen && currentDue.dueDate ? fmtDate(currentDue.dueDate) : '—'
  // Whole days until the due date (negative = overdue), computed in local time.
  const daysLeft = dueOpen && currentDue.dueDate
    ? Math.round((new Date(currentDue.dueDate + 'T00:00:00').getTime() - new Date(new Date().toDateString()).getTime()) / 86400000)
    : null
  const daysLabel = daysLeft == null ? '' : daysLeft < 0 ? `Overdue by ${-daysLeft} day${daysLeft === -1 ? '' : 's'}` : daysLeft === 0 ? 'Due today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`

  const topAnnouncements = ((announcements ?? []) as any[]).slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f2d4a 0%, #1d6ea8 100%)' }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #3aaee8, transparent)', transform: 'translate(30%, -30%)' }}
        />
        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>Welcome back, {displayName} 👋</p>
        <h1 className="text-2xl font-bold mt-0.5 tracking-tight">Your Hostel at a Glance</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {noStay ? 'No active stay yet — find a hostel and request a bed' : `${hostelName} · Room ${roomNumber} · Active Resident`}
        </p>
      </div>

      {/* Profile completion banner */}
      {profileCompletion && profileCompletion.completionPercent < 100 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <UserCheck size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-amber-900 text-sm">Complete your profile</p>
                {profileCompletion.missingFields?.length > 0 && (
                  <p className="text-xs text-amber-700 mt-0.5">
                    Missing: {(profileCompletion.missingFields as string[]).join(', ')}
                  </p>
                )}
                <div className="mt-2 w-48 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${profileCompletion.completionPercent}%` }}
                  />
                </div>
                <p className="text-xs text-amber-600 mt-1 font-medium">{profileCompletion.completionPercent}% complete</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/app/profile')}
              className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #b45309, #d97706)' }}
            >
              Complete Now
            </button>
          </div>
        </div>
      )}

      {noStay && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
              <Compass size={18} className="text-brand-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">You haven't moved in yet</p>
              <p className="text-xs text-gray-500 mt-0.5">Discover hostels, pick a bed and track your request. Dues, menu and services unlock once a hostel approves your booking.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/app/discover" className="px-4 py-2 rounded-xl text-xs font-bold text-white brand-gradient hover:opacity-90">Discover Hostels</Link>
            <Link to="/app/booking-status" className="px-4 py-2 rounded-xl text-xs font-bold text-brand-600 border border-brand-200 hover:bg-brand-50">Booking Status</Link>
          </div>
        </div>
      )}

      {!noStay && (<>
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Due"
          value={dueAmount}
          sub={dueDateStr !== '—' ? `Due ${dueDateStr}` : 'No due information'}
          icon={<CreditCard size={20} className="text-brand-600" />}
          iconBg="bg-brand-50"
          trend={daysLeft != null ? { value: daysLabel, up: daysLeft >= 0 } : undefined}
        />
        <StatCard
          label="My Room"
          value={roomNumber}
          sub="Active Resident"
          icon={<Home size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Hostel"
          value={hostelName}
          sub={joinDate !== '...' ? `Joined ${joinDate}` : 'Active Resident'}
          icon={<Building2 size={20} className="text-purple-600" />}
          iconBg="bg-purple-50"
        />
      </div>

      {/* Upcoming payment */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div
          className="flex items-center gap-3 px-5 py-3"
          style={{ background: '#fffbf0', borderBottom: '1px solid #fef3c7' }}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
          <p className="text-sm font-semibold text-amber-800">Upcoming Payment</p>
          {daysLeft != null && (
            <span className={`ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full ${daysLeft < 0 ? 'text-red-700 bg-red-100' : 'text-amber-700 bg-amber-100'}`}>
              {daysLabel}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 px-5 py-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-400 font-medium">{dueOpen ? 'Monthly Hostel Fee' : 'No pending payment'}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1 tracking-tight">{dueOpen ? dueAmount : 'All clear'}</p>
          </div>
          {dueOpen && <Link
            to="/app/dues"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1d6ea8, #1a8fd1)' }}
          >
            <CreditCard size={15} /> Pay Now <ChevronRight size={14} />
          </Link>}
        </div>
      </div>

      {hostelId && <ReviewCard hostelId={hostelId} hostellerProfileId={hostellerProfileId} />}
      </>)}

      {/* Announcements + Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Announcements */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <Megaphone size={13} className="text-blue-600" />
              </div>
              <h2 className="font-semibold text-gray-800 text-sm">Announcements</h2>
            </div>
            <Link
              to="/app/announcements"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-0.5"
            >
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {topAnnouncements.length === 0 && (
              <div className="px-5 py-4 text-xs text-gray-400">No announcements</div>
            )}
            {topAnnouncements.map((a) => (
              <div key={a.id} className="px-5 py-3.5 hover:bg-gray-50/70 transition-colors">
                <div className="flex items-start gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${CATEGORY_DOT[a.category] ?? 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-800 text-sm truncate">{a.title}</p>
                      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{fmtDate(a.validFrom)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
                <Bell size={13} className="text-gray-500" />
              </div>
              <h2 className="font-semibold text-gray-800 text-sm">Quick Access</h2>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {QUICK_LINKS.map((q) => (
                <Link
                  key={q.to}
                  to={q.to}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-sm ${q.bg} ${q.border}`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center shadow-sm ${q.iconColor}`}>
                    <q.icon size={16} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{q.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
