import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import LoginForm from '../../components/auth/LoginForm'
import { redirectAfterLogin } from '../../components/auth/redirectAfterLogin'
import { loginHosteller } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { STRINGS } from '../../constants/strings'

export default function HostellerLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { mutate, isPending, error } = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginHosteller({ email, password }),
    onSuccess: (response) => {
      const { accessToken, refreshToken, role, subRole, email, hostelId, hostellerProfileId, bookingId } = response.data
      setAuth({ accessToken, refreshToken, role, subRole, email, hostelId, hostellerProfileId, bookingId })
      // No hostel yet (newly registered) -> start at hostel discovery to request a bed
      navigate(hostelId ? redirectAfterLogin(location.state, '/app', '/app/dashboard') : '/app/discover', { replace: true })
    },
  })

  const errorMsg = error
    ? axios.isAxiosError(error)
      ? (error.response?.data?.message ?? 'Login failed. Please try again.')
      : (error as Error).message
    : null

  return (
    <LoginForm
      portalLabel={STRINGS.auth.hostellerPortal}
      onSubmit={(email, password) => mutate({ email, password })}
      isLoading={isPending}
      error={errorMsg}
      signupLink={{ label: STRINGS.auth.signUp, to: '/auth/signup' }}
      otherPortals={[
        { label: STRINGS.auth.staffPortal, to: '/auth/staff/login' },
        { label: STRINGS.auth.superAdminPortal, to: '/auth/super-admin/login' },
      ]}
    />
  )
}
