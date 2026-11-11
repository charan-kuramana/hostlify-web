import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import LoginForm from '../../components/auth/LoginForm'
import { redirectAfterLogin } from '../../components/auth/redirectAfterLogin'
import { loginStaff } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { STRINGS } from '../../constants/strings'

export default function StaffLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)

  const { mutate, isPending, error } = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginStaff({ email, password }),
    onSuccess: (response) => {
      const { accessToken, refreshToken, role, subRole, email, hostelIds, ownerId } = response.data
      setAuth({ accessToken, refreshToken, role, subRole, email, hostelIds, ownerId })
      navigate(redirectAfterLogin(location.state, '/admin', '/admin/dashboard'), { replace: true })
    },
  })

  const errorMsg = error
    ? axios.isAxiosError(error)
      ? (error.response?.data?.message ?? 'Login failed. Please try again.')
      : (error as Error).message
    : null

  return (
    <LoginForm
      portalLabel={STRINGS.auth.staffPortal}
      onSubmit={(email, password) => mutate({ email, password })}
      isLoading={isPending}
      error={errorMsg}
      otherPortals={[
        { label: STRINGS.auth.hostellerPortal, to: '/auth/login' },
        { label: STRINGS.auth.superAdminPortal, to: '/auth/super-admin/login' },
      ]}
    />
  )
}
