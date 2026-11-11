import { useState, Suspense } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Menu, X, LogOut, Bell } from 'lucide-react'
import { useAuthStore, LOGIN_PATH } from '../store/authStore'
import { STRINGS } from '../constants/strings'
import type { ComponentType } from 'react'

type IconType = ComponentType<{ size?: number; className?: string }>

export interface NavItem {
  label: string
  to: string
  icon: IconType
}

export interface NavGroup {
  label: string
  icon: IconType
  children: NavItem[]
}

export type NavEntry = NavItem | NavGroup

function isGroup(e: NavEntry): e is NavGroup {
  return (e as NavGroup).children !== undefined
}

interface PortalLayoutProps {
  navItems: NavEntry[]
  portalName: string
  /** Up to 4 leaf items shown in the mobile bottom tab bar (a 5th "Menu" tab is added automatically). */
  bottomNav?: NavItem[]
  /** Where the footer avatar + header avatar link to. */
  profilePath?: string
}

const allLeaves = (items: NavEntry[]): NavItem[] =>
  items.flatMap((e) => (isGroup(e) ? e.children : [e]))

function ContentLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin" />
    </div>
  )
}

export default function PortalLayout({ navItems, portalName, bottomNav, profilePath = '/app/profile' }: PortalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { role, logout: storeLogout } = useAuthStore()
  const path = location.pathname

  const leaves = allLeaves(navItems)
  const activeLeaf = leaves.find((l) => path.startsWith(l.to))
  // The group (if any) that the current route belongs to — drives the section tab bar.
  const activeGroup = navItems.find((e): e is NavGroup => isGroup(e) && e.children.some((c) => path.startsWith(c.to)))

  const displayName = role?.replace(/_/g, ' ') ?? 'User'
  const initials = displayName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  const currentPage = activeLeaf?.label ?? STRINGS.portal.dashboard
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const queryClient = useQueryClient()

  function logout() {
    const loginPath = (role && LOGIN_PATH[role]) || '/auth/login'
    // Clears the local session and revokes the refresh token server-side (best effort)
    void storeLogout()
    // Drop every cached query — most keys aren't user-scoped (e.g. ['current-due']),
    // so the next account to sign in on this tab would briefly see this user's data.
    queryClient.clear()
    navigate(loginPath, { replace: true })
  }

  // ── Sidebar item renderers ────────────────────────────────────────────────
  const baseItem = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative'

  const renderLeaf = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) =>
        `${baseItem} ${isActive ? 'text-white' : 'text-white/60 hover:text-white/90 hover:bg-white/5'}`
      }
      style={({ isActive }) => (isActive ? { background: 'linear-gradient(135deg, rgba(29,110,168,0.95), rgba(26,143,209,0.9))' } : {})}
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-sky-300" />}
          <item.icon size={17} className="shrink-0 ml-1" />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  )

  // A group is a single nav item that jumps to its first child; its sub-pages appear as tabs in the content.
  const renderGroup = (group: NavGroup) => {
    const active = group.children.some((c) => path.startsWith(c.to))
    return (
      <button
        key={group.label}
        onClick={() => { navigate(group.children[0].to); setSidebarOpen(false) }}
        className={`${baseItem} ${active ? 'text-white' : 'text-white/60 hover:text-white/90 hover:bg-white/5'}`}
        style={active ? { background: 'linear-gradient(135deg, rgba(29,110,168,0.95), rgba(26,143,209,0.9))' } : {}}
      >
        {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-sky-300" />}
        <group.icon size={17} className="shrink-0 ml-1" />
        <span className="truncate">{group.label}</span>
      </button>
    )
  }

  const SidebarInner = (
    <>
      <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white brand-gradient">H</div>
            <span className="text-white font-bold text-lg tracking-tight">{STRINGS.common.appName}</span>
          </div>
          <div className="text-xs mt-0.5 font-medium pl-9" style={{ color: 'rgba(255,255,255,0.35)' }}>{portalName} Portal</div>
        </div>
        <button className="lg:hidden text-white/50 hover:text-white transition-colors" onClick={() => setSidebarOpen(false)}>
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>Main Menu</p>
        {navItems.map((e) => (isGroup(e) ? renderGroup(e) : renderLeaf(e)))}
      </nav>

      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          onClick={() => { navigate(profilePath); setSidebarOpen(false) }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 brand-gradient">{initials}</div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Hostlify · {portalName}</p>
          </div>
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mt-1 transition-colors text-white/35 hover:text-white/75 hover:bg-white/5"
        >
          <LogOut size={16} className="ml-1 shrink-0" />
          <span className="font-medium">Sign out</span>
        </button>
      </div>
    </>
  )

  const barItems = (bottomNav ?? leaves.slice(0, 4)).slice(0, 4)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#eef1f5' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: 232, background: '#0f2d4a' }}
      >
        {SidebarInner}
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 sm:px-5 gap-3 shrink-0">
          <button className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 hidden sm:block">{greeting} 👋</span>
              <span className="text-gray-200 hidden sm:block">·</span>
              <span className="font-semibold text-gray-800 truncate">{activeGroup ? activeGroup.label : currentPage}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="relative w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
              <Bell size={17} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <button
              onClick={() => navigate(profilePath)}
              className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-xs font-bold text-white shrink-0 brand-gradient hover:brightness-105 transition-all"
            >
              {initials}
            </button>
          </div>
        </header>

        {/* Section tabs (sub-navigation for the active group) */}
        {activeGroup && activeGroup.children.length > 1 && (
          <div className="bg-white border-b border-gray-200 px-4 sm:px-5 md:px-8 shrink-0 overflow-x-auto">
            <div className="max-w-6xl mx-auto flex items-center gap-1 h-12">
              {activeGroup.children.map((c) => {
                const active = path.startsWith(c.to)
                return (
                  <button
                    key={c.to}
                    onClick={() => navigate(c.to)}
                    className={`flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors ${
                      active ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <c.icon size={15} />
                    {c.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Content — inner Suspense so only this region swaps while a page chunk loads (sidebar/header stay put) */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-5 md:px-8 py-6 md:py-7 pb-24 lg:pb-7">
            <Suspense fallback={<ContentLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        {barItems.map((item) => {
          const active = path.startsWith(item.to)
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${active ? 'text-brand-600' : 'text-gray-400'}`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-semibold truncate max-w-full">{item.label}</span>
            </button>
          )
        })}
        <button onClick={() => setSidebarOpen(true)} className="flex-1 flex flex-col items-center gap-0.5 py-2 text-gray-400 hover:text-gray-600 transition-colors">
          <Menu size={20} />
          <span className="text-[10px] font-semibold">Menu</span>
        </button>
      </nav>
    </div>
  )
}
