import Box from '@mui/material/Box'
import { Outlet, useMatches } from 'react-router-dom'
import type { RouteHandle } from '@/app/routeHandle'
import { usePinnedPagesSync } from '@/hooks/usePinnedPagesSync'
import { Header } from '@/layouts/Header/Header'
import { Sidebar } from '@/layouts/Sidebar/Sidebar'
import { ForbiddenPage } from '@/pages/ErrorPages'
import { usePermission } from '@/stores/authStore'

/** Quyền yêu cầu của route sâu nhất (handle.permission); thiếu quyền → trang 403. */
function PermissionGate() {
  const matches = useMatches()
  const required = [...matches].reverse().find((m) => (m.handle as RouteHandle | undefined)?.permission)
  const allowed = usePermission((required?.handle as RouteHandle | undefined)?.permission)
  return allowed ? <Outlet /> : <ForbiddenPage />
}

export function MainLayout() {
  usePinnedPagesSync()
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar />
        <Box component="main" sx={{ flex: 1, minWidth: 0, overflow: 'auto', p: { xs: 2, md: 3 } }}>
          <PermissionGate />
        </Box>
      </Box>
    </Box>
  )
}
