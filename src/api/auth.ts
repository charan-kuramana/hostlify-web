import { apiClient } from './client'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  firstName: string
  lastName: string
  email: string
  password: string
  mobile: string
}

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  timestamp: number
}

export interface AuthData {
  accessToken: string
  refreshToken: string
  role: string
  subRole?: string
  email?: string
  // Hosteller context
  hostelId?: number
  hostellerProfileId?: number
  bookingId?: number
  // Staff context
  hostelIds?: number[]
  ownerId?: number
}

export const registerHosteller = (data: RegisterPayload) =>
  apiClient.post<ApiResponse<AuthData>>('/auth/register/hosteller', data).then((r) => r.data)

export const loginHosteller = (data: LoginPayload) =>
  apiClient.post<ApiResponse<AuthData>>('/auth/hosteller/login', data).then((r) => r.data)

export const loginStaff = (data: LoginPayload) =>
  apiClient.post<ApiResponse<AuthData>>('/auth/staff/login', data).then((r) => r.data)

export const loginSuperAdmin = (data: LoginPayload) =>
  apiClient.post<ApiResponse<AuthData>>('/auth/superadmin/login', data).then((r) => r.data)

export const refreshAuthToken = (refreshToken: string) =>
  apiClient.post<ApiResponse<AuthData>>(`/auth/refresh?refreshToken=${refreshToken}`).then((r) => r.data)

export const requestPasswordOtp = (email: string) =>
  apiClient.post<ApiResponse<null>>('/auth/forgot-password', { email }).then((r) => r.data)

export const resetPassword = (email: string, otp: string, newPassword: string) =>
  apiClient.post<ApiResponse<null>>('/auth/reset-password', { email, otp, newPassword }).then((r) => r.data)
