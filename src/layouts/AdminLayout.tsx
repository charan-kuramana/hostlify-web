import {
  LayoutDashboard,
  ClipboardList,
  Users,
  CreditCard,
  MessageSquare,
  Receipt,
  Bell,
  UtensilsCrossed,
  CalendarX,
  Map,
  Car,
  SprayCan,
  Settings,
  UserCog,
  BarChart3,
  Star,
  UserCircle,
  Wrench,
  Building2,
  Wallet,
  Megaphone,
  Inbox,
} from 'lucide-react'
import PortalLayout, { type NavEntry, type NavGroup, type NavItem } from './PortalLayout'
import { useAuthStore } from '../store/authStore'

const NAV: NavEntry[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  {
    label: 'Hostel',
    icon: Building2,
    children: [
      { label: 'Hostel Setup', to: '/admin/hostel-setup', icon: Building2 },
      { label: 'Occupancy Map', to: '/admin/occupancy', icon: Map },
      { label: 'Settings', to: '/admin/settings', icon: Settings },
    ],
  },
  {
    label: 'Residents',
    icon: Users,
    children: [
      { label: 'Enquiries', to: '/admin/enquiries', icon: Inbox },
      { label: 'Allocations', to: '/admin/allocations', icon: ClipboardList },
      { label: 'Members', to: '/admin/members', icon: Users },
      { label: 'Leave', to: '/admin/leave', icon: CalendarX },
    ],
  },
  {
    label: 'Finance',
    icon: Wallet,
    children: [
      { label: 'Payments', to: '/admin/payments', icon: CreditCard },
      { label: 'Expenses', to: '/admin/expenses', icon: Receipt },
      { label: 'Revenue Report', to: '/admin/revenue', icon: BarChart3 },
    ],
  },
  {
    label: 'Operations',
    icon: Wrench,
    children: [
      { label: 'Complaints', to: '/admin/complaints', icon: MessageSquare },
      { label: 'Maintenance', to: '/admin/maintenance', icon: Wrench },
      { label: 'Menu', to: '/admin/menu', icon: UtensilsCrossed },
      { label: 'Cleaning', to: '/admin/cleaning', icon: SprayCan },
      { label: 'Vehicle Parking', to: '/admin/parking', icon: Car },
    ],
  },
  {
    label: 'Engagement',
    icon: Megaphone,
    children: [
      { label: 'Announcements', to: '/admin/announcements', icon: Bell },
      { label: 'Reviews', to: '/admin/reviews', icon: Star },
    ],
  },
  { label: 'Staff & Employees', to: '/admin/staff', icon: UserCog },
  { label: 'My Account', to: '/admin/account', icon: UserCircle },
]

// Finance-related routes hidden for SUPERVISOR sub_role
const FINANCE_ROUTES = new Set(['/admin/payments', '/admin/expenses', '/admin/employees', '/admin/revenue', '/admin/staff'])

function filterForSupervisor(entries: NavEntry[]): NavEntry[] {
  return entries
    .map((e) => {
      if ('children' in e) {
        const kids = (e as NavGroup).children.filter((c) => !FINANCE_ROUTES.has(c.to))
        return kids.length ? { ...e, children: kids } : null
      }
      return FINANCE_ROUTES.has((e as NavItem).to) ? null : e
    })
    .filter(Boolean) as NavEntry[]
}

export default function AdminLayout() {
  const subRole = useAuthStore((s) => s.subRole)
  const isSupervisor = subRole === 'SUPERVISOR'
  const navItems = isSupervisor ? filterForSupervisor(NAV) : NAV

  const bottomNav: NavItem[] = [
    { label: 'Home', to: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Allocations', to: '/admin/allocations', icon: ClipboardList },
    { label: 'Members', to: '/admin/members', icon: Users },
    isSupervisor
      ? { label: 'Complaints', to: '/admin/complaints', icon: MessageSquare }
      : { label: 'Payments', to: '/admin/payments', icon: CreditCard },
  ]

  return <PortalLayout navItems={navItems} portalName="Staff" bottomNav={bottomNav} profilePath="/admin/account" />
}
