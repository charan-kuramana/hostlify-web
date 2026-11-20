import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import type { ReactNode } from 'react'

/** Header + footer for the no-login hostel pages. */
export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/hostels" className="flex items-center gap-2 font-bold text-gray-900">
            <span className="w-8 h-8 rounded-xl brand-gradient flex items-center justify-center"><Building2 size={16} className="text-white" /></span>
            Hostlify
          </Link>
          <nav className="ml-auto flex items-center gap-2 text-sm">
            <Link to="/hostels" className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hidden sm:block">Find a hostel</Link>
            <Link to="/auth/login" className="px-3 py-1.5 rounded-lg font-semibold text-brand-700 hover:bg-brand-50">Resident login</Link>
            <Link to="/auth/staff/login" className="px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hidden sm:block">Owners</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">{children}</main>
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-5 text-xs text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
          <span>© {new Date().getFullYear()} Hostlify</span>
          <span>Hostels, PGs and co-living, listed directly by owners.</span>
        </div>
      </footer>
    </div>
  )
}
