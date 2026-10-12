import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { useAuthStore } from '@/stores/authStore'

export function ProtectedRoute() {
  const location = useLocation()
  const status = useAuthStore((s) => s.status)
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword ?? false)

  if (status === 'loading') return <FullScreenLoader />
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }
  // Backend chặn mọi API ngoài /auth khi bắt đổi mật khẩu, nên giao diện cũng chỉ cho vào trang đổi mật khẩu.
  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }
  return <Outlet />
}

export function PublicOnlyRoute() {
  const status = useAuthStore((s) => s.status)
  if (status === 'loading') return <FullScreenLoader />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <Outlet />
}
