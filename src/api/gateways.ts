import { apiClient } from './client'

export type GatewayProvider = 'RAZORPAY' | 'STRIPE' | 'PAYPAL'

export interface OwnerGateway {
  id: number
  provider: GatewayProvider
  providerName: string
  hostelId: number | null
  hostelName: string | null
  mode: 'TEST' | 'LIVE'
  label: string | null
  publicKey: string | null
  secretMask: string | null
  hasWebhookSecret: boolean
  webhookPath: string
  enabled: boolean
  lastTestedAt: string | null
  lastTestOk: boolean | null
  lastTestMessage: string | null
}

export interface OnlineOption { provider: GatewayProvider; name: string; testMode: boolean }

// ── Owner ──
export const listGateways = (): Promise<OwnerGateway[]> => apiClient.get('/payment/gateways').then((r) => r.data.data)
export const createGateway = (body: Record<string, unknown>): Promise<OwnerGateway> =>
  apiClient.post('/payment/gateways', body).then((r) => r.data.data)
export const updateGateway = (id: number, body: Record<string, unknown>): Promise<OwnerGateway> =>
  apiClient.put(`/payment/gateways/${id}`, body).then((r) => r.data.data)
export const deleteGateway = (id: number) => apiClient.delete(`/payment/gateways/${id}`).then((r) => r.data)
export const testGateway = (id: number): Promise<OwnerGateway> => apiClient.post(`/payment/gateways/${id}/test`).then((r) => r.data.data)

/** Full webhook URL on the API server (the API base minus /api/v1). */
export function webhookUrl(path: string) {
  const base = String(apiClient.defaults.baseURL ?? '')
  const origin = /^https?:\/\//.test(base) ? new URL(base).origin : window.location.origin
  return origin + path
}

// ── Resident ──
export const getOnlineOptions = (): Promise<OnlineOption[]> => apiClient.get('/payment/online/options').then((r) => r.data.data)
export const startOnlinePayment = (dueId: number, provider: GatewayProvider) =>
  apiClient.post('/payment/online/initiate', { dueId, provider }).then((r) => r.data.data)
export const verifyOnlinePayment = (body: Record<string, unknown>) =>
  apiClient.post('/payment/online/verify', body).then((r) => r.data.data)

/** Google Maps directions from the viewer's current location to a hostel (opens the Maps app on phones). */
export function directionsUrl(h: { latitude?: number | string | null; longitude?: number | string | null; name?: string; address?: string; city?: string }) {
  if (h.latitude != null && h.longitude != null && h.latitude !== '' && h.longitude !== '') {
    return `https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`
  }
  const q = [h.name, h.address, h.city].filter(Boolean).join(', ')
  return q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}` : null
}
