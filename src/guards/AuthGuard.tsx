import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore, loginPathForUrl } from '../store/authStore'

export default function AuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    // Send the user to the login page of the portal they tried to open; it returns them here after login
    return <Navigate to={loginPathForUrl(location.pathname)} state={{ from: location }} replace />
  }

  return <Outlet />
}
