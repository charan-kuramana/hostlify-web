import {
  LayoutDashboard,
  CreditCard,
  User,
  MessageSquare,
  UtensilsCrossed,
  CalendarX,
  Wrench,
  UserPlus,
  Bell,
  Car,
  SprayCan,
  Compass,
  CalendarClock,
  BedDouble,
  HeartHandshake,
  FileCheck,
} from 'lucide-react'
import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import PortalLayout, { type NavEntry, type NavItem } from './PortalLayout'
import { useAuthStore } from '../store/authStore'
import { getMyBooking } from '../api/hosteller'
import { refreshAuthToken } from '../api/auth'

// Grouped to keep the sidebar uncluttered. All routes are unchanged.
const navItems: NavEntry[] = [
  { label: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard },
  {
    label: 'Find & Book',
    icon: Compass,
    children: [
      { label: 'Discover Hostels', to: '/app/discover', icon: Compass },
      { label: 'Booking Status', to: '/app/booking-status', icon: CalendarClock },
    ],
  },
  {
    label: 'My Stay',
    icon: BedDouble,
    children: [
      { label: 'My Dues', to: '/app/dues', icon: CreditCard },
      { label: 'My Documents', to: '/app/documents', icon: FileCheck },
      { label: 'Complaints', to: '/app/complaints', icon: MessageSquare },
      { label: 'Leave', to: '/app/leave', icon: CalendarX },
      { label: 'My Profile', to: '/app/profile', icon: User },
    ],
  },
  {
    label: 'Services',
    icon: HeartHandshake,
    children: [
      { label: 'Menu', to: '/app/menu', icon: UtensilsCrossed },
      { label: 'Cleaning', to: '/app/cleaning', icon: SprayCan },
      { label: 'Vehicle Parking', to: '/app/parking', icon: Car },
      { label: 'Other Services', to: '/app/service', icon: Wrench },
    ],
  },
  { label: 'Announcements', to: '/app/announcements', icon: Bell },
  { label: 'Referral', to: '/app/referral', icon: UserPlus },
]

// Most-used destinations for the mobile bottom tab bar.
const bottomNav: NavItem[] = [
  { label: 'Home', to: '/app/dashboard', icon: LayoutDashboard },
  { label: 'Discover', to: '/app/discover', icon: Compass },
  { label: 'Dues', to: '/app/dues', icon: CreditCard },
  { label: 'Profile', to: '/app/profile', icon: User },
]

/**
 * The JWT/session only carries hostelId + bookingId from login time. When staff approve a
 * pending hosteller's booking (or reassign them), re-issue the token so the new stay context
 * (announcements, menu, dues, …) shows up without forcing a logout/login.
 */
function useStaySync() {
  const { role, hostelId, bookingId, setAuth } = useAuthStore()
  const queryClient = useQueryClient()
  const { data: booking } = useQuery({
    queryKey: ['my-booking-sync'],
    queryFn: getMyBooking,
    // Only needed until the session knows the hosteller's hostel (pending → approved).
    enabled: role === 'HOSTELLER' && !hostelId,
    retry: false,
    staleTime: 25000,
    // While waiting for approval, poll occasionally so the portal unlocks on its own.
    refetchInterval: 30000,
  })
  useEffect(() => {
    if (!booking?.id || (booking.hostelId === hostelId && booking.id === bookingId)) return
    const rt = localStorage.getItem('hostlify-refresh-token')
    if (!rt) return
    refreshAuthToken(rt)
      .then((res) => {
        if (!res?.success) return
        setAuth(res.data)
        queryClient.invalidateQueries()
      })
      .catch(() => { /* keep the current session; pages still work off /booking/me */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id, booking?.hostelId])
}

export default function AppLayout() {
  useStaySync()
  return <PortalLayout navItems={navItems} portalName="Hosteller" bottomNav={bottomNav} profilePath="/app/profile" />
}
