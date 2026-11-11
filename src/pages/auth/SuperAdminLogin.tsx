import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import LoginForm from '../../components/auth/LoginForm'
import { redirectAfterLogin } from '../../components/auth/redirectAfterLogin'
import { loginSuperAdmin } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { STRINGS } from '../../constants/strings'

export default function SuperAdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { mutate, isPending, error } = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginSuperAdmin({ email, password }),
    onSuccess: (response) => {
      const { accessToken, refreshToken, role, subRole, email } = response.data
      setAuth({ accessToken, refreshToken, role, subRole, email, hostelIds: [] })
      navigate(redirectAfterLogin(location.state, '/super-admin', '/super-admin/dashboard'), { replace: true })
    },
  })

  const errorMsg = error
    ? axios.isAxiosError(error)
      ? (error.response?.data?.message ?? 'Login failed. Please try again.')
      : (error as Error).message
    : null

  return (
    <LoginForm
      portalLabel={STRINGS.auth.superAdminPortal}
      onSubmit={(email, password) => mutate({ email, password })}
      isLoading={isPending}
      error={errorMsg}
      otherPortals={[
        { label: STRINGS.auth.hostellerPortal, to: '/auth/login' },
        { label: STRINGS.auth.staffPortal, to: '/auth/staff/login' },
      ]}
    />
  )
}
