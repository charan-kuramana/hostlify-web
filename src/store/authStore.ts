import axios from 'axios'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8090/api/v1'

/** Login page of each portal, by role. */
export const LOGIN_PATH: Record<string, string> = {
  HOSTELLER: '/auth/login',
  HOSTEL_STAFF: '/auth/staff/login',
  SUPER_ADMIN: '/auth/super-admin/login',
}

/** Login page for a protected path (used when there is no session to read the role from). */
export function loginPathForUrl(pathname: string): string {
  if (pathname.startsWith('/super-admin')) return LOGIN_PATH.SUPER_ADMIN
  if (pathname.startsWith('/admin')) return LOGIN_PATH.HOSTEL_STAFF
  return LOGIN_PATH.HOSTELLER
}

interface AuthState {
  accessToken: string | null
  role: string | null
  subRole: string | null
  email: string | null
  isAuthenticated: boolean
  // Hosteller context
  hostelId: number | null
  hostellerProfileId: number | null
  bookingId: number | null
  // Staff context
  hostelIds: number[]
  ownerId: number | null
  activeHostelId: number | null  // current hostel selected by staff

  setAuth: (data: {
    accessToken: string
    refreshToken: string
    role: string
    subRole?: string
    email?: string
    hostelId?: number
    hostellerProfileId?: number
    bookingId?: number
    hostelIds?: number[]
    ownerId?: number
  }) => void
  setActiveHostelId: (id: number) => void
  clearAuth: () => void
  /** Revokes the refresh token on the server (best effort) and clears the local session. */
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      role: null,
      subRole: null,
      email: null,
      isAuthenticated: false,
      hostelId: null,
      hostellerProfileId: null,
      bookingId: null,
      hostelIds: [],
      ownerId: null,
      activeHostelId: null,

      setAuth: ({ accessToken, refreshToken, role, subRole, email, hostelId, hostellerProfileId, bookingId, hostelIds, ownerId }) => {
        localStorage.setItem('hostlify-access-token', accessToken)
        localStorage.setItem('hostlify-refresh-token', refreshToken)
        const ids = hostelIds ?? []
        set({
          accessToken,
          role,
          subRole: subRole ?? null,
          email: email ?? null,
          isAuthenticated: true,
          hostelId: hostelId ?? null,
          hostellerProfileId: hostellerProfileId ?? null,
          bookingId: bookingId ?? null,
          hostelIds: ids,
          ownerId: ownerId ?? null,
          activeHostelId: ids.length > 0 ? ids[0] : null,
        })
      },

      setActiveHostelId: (id) => set({ activeHostelId: id }),

      clearAuth: () => {
        localStorage.removeItem('hostlify-access-token')
        localStorage.removeItem('hostlify-refresh-token')
        set({
          accessToken: null, role: null, subRole: null, email: null, isAuthenticated: false,
          hostelId: null, hostellerProfileId: null, bookingId: null,
          hostelIds: [], ownerId: null, activeHostelId: null,
        })
      },

      logout: async () => {
        const refreshToken = localStorage.getItem('hostlify-refresh-token')
        get().clearAuth()
        if (refreshToken) {
          try {
            await axios.post(`${BASE_URL}/auth/logout?refreshToken=${encodeURIComponent(refreshToken)}`, null, { timeout: 3000 })
          } catch {
            // Session is already cleared locally; server-side revocation is best effort
          }
        }
      },
    }),
    { name: 'hostlify-auth' }
  )
)
