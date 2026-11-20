import { LayoutDashboard, Users, BarChart3, MapPin, MessageSquare, UserCircle, Tag } from 'lucide-react'
import PortalLayout, { type NavEntry, type NavItem } from './PortalLayout'

const navItems: NavEntry[] = [
  { label: 'Dashboard',  to: '/super-admin/dashboard',  icon: LayoutDashboard },
  { label: 'Owners',     to: '/super-admin/owners',     icon: Users },
  { label: 'Revenue',    to: '/super-admin/revenue',    icon: BarChart3 },
  { label: 'Occupancy',  to: '/super-admin/occupancy',  icon: MapPin },
  { label: 'Complaints', to: '/super-admin/complaints', icon: MessageSquare },
  { label: 'Plans & Pricing', to: '/super-admin/pricing', icon: Tag },
  { label: 'My Account', to: '/super-admin/account',    icon: UserCircle },
]

const bottomNav: NavItem[] = [
  { label: 'Home',    to: '/super-admin/dashboard', icon: LayoutDashboard },
  { label: 'Owners',  to: '/super-admin/owners',    icon: Users },
  { label: 'Revenue', to: '/super-admin/revenue',   icon: BarChart3 },
  { label: 'Account', to: '/super-admin/account',   icon: UserCircle },
]

export default function SuperAdminLayout() {
  return <PortalLayout navItems={navItems} portalName="Super Admin" bottomNav={bottomNav} profilePath="/super-admin/account" />
}
