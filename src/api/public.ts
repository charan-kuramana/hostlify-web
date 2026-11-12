import axios from 'axios'

// Plain client for the no-login pages: no auth token, no session-refresh redirects, no global error toasts
// (forms show their own errors inline).
const publicClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8090/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export interface PublicHostelCard {
  id: number
  slug: string
  name: string
  hostelType: string
  city: string
  locality?: string
  landmark?: string
  availableBeds: number
  minRent?: number
  amenities: string[]
  coverUrl?: string | null
}

export const searchPublicHostels = (params: { city?: string; type?: string; maxRent?: number; q?: string }) =>
  publicClient.get('/public/hostels', { params }).then((r) => r.data.data as PublicHostelCard[])

export const getPublicCities = () =>
  publicClient.get('/public/cities').then((r) => r.data.data as { city: string; count: number }[])

export const getPublicHostel = (slug: string) =>
  publicClient.get(`/public/hostels/${encodeURIComponent(slug)}`).then((r) => r.data.data)

export const sendEnquiry = (slug: string, data: Record<string, unknown>) =>
  publicClient.post(`/public/hostels/${encodeURIComponent(slug)}/enquiries`, data).then((r) => r.data.message as string)
