import CloseIcon from '@mui/icons-material/Close'
import HistoryIcon from '@mui/icons-material/History'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { useAuditLogs } from '@/features/audit/api'
import { AuditTimeline } from '@/features/audit/components/AuditTimeline'
import { moduleLabel } from '@/features/audit/constants'
import { useBuildingStore } from '@/stores/buildingStore'

interface Props {
  open: boolean
  onClose: () => void
  /** Lọc theo module (từ trang danh sách) hoặc theo một đối tượng cụ thể. */
  module?: string
  entityType?: string
  entityId?: string | number
  title?: string
}

/** Ngăn kéo lịch sử thay đổi mở từ nút ⟲ trên trang danh sách / chi tiết. */
export function AuditHistoryDrawer({ open, onClose, module, entityType, entityId, title }: Props) {
  const [size, setSize] = useState(20)
  const allBuildings = useBuildingStore((s) => s.selectedBuildingId == null)
  const params: Record<string, string | number> = { size, ...(module ? { module } : {}) }
  if (entityType) params.entityType = entityType
  if (entityId != null) params.entityId = String(entityId)
  const { data, isLoading, isFetching, error, refetch } = useAuditLogs(params, open)
  const logs = data?.content ?? []
  const query = new URLSearchParams({ ...(module ? { module } : {}) }).toString()

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 } } } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <HistoryIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={700}>Lịch sử thay đổi</Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {title ?? (module ? moduleLabel(module) : 'Mọi chức năng')}
          </Typography>
        </Box>
        <IconButton aria-label="Đóng lịch sử" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Stack>
      <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isLoading ? (
          <Stack spacing={1.5}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={56} />
            ))}
          </Stack>
        ) : logs.length === 0 ? (
          <EmptyState icon={<HistoryIcon fontSize="inherit" />} message="Chưa có thay đổi nào" />
        ) : (
          <>
            <AuditTimeline logs={logs} showBuilding={allBuildings} />
            {data && data.totalElements > logs.length && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button size="small" disabled={isFetching} onClick={() => setSize(50)}>
                  {size >= 50 ? 'Đã hiện 50 mục mới nhất' : 'Xem thêm'}
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
      <Box sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: 'divider' }}>
        <Link component={RouterLink} to={`/settings/audit-logs${query ? `?${query}` : ''}`} onClick={onClose} underline="hover">
          Mở Nhật ký hoạt động
        </Link>
      </Box>
    </Drawer>
  )
}
