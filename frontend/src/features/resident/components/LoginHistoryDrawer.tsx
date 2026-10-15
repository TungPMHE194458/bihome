import CloseIcon from '@mui/icons-material/Close'
import HistoryIcon from '@mui/icons-material/History'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { StatusChip } from '@/components/StatusChip'
import { useAppLoginHistory } from '@/features/resident/hooks'
import { formatDateTime } from '@/lib/format'

interface Props {
  open: boolean
  onClose: () => void
  residentId: number
}

/** Lịch sử đăng nhập app cư dân (thành công và thất bại), mở từ panel tài khoản app. */
export function LoginHistoryDrawer({ open, onClose, residentId }: Props) {
  const [size, setSize] = useState(20)
  const { data, isLoading, isFetching, error, refetch } = useAppLoginHistory(residentId, size, open)
  const items = data?.content ?? []

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 } } } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <HistoryIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={700}>Lịch sử đăng nhập app</Typography>
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
              <Skeleton key={i} variant="rounded" height={64} />
            ))}
          </Stack>
        ) : items.length === 0 ? (
          <EmptyState icon={<HistoryIcon fontSize="inherit" />} message="Chưa có lượt đăng nhập nào" />
        ) : (
          <>
            <Stack spacing={1.5}>
              {items.map((h) => (
                <Box key={h.id} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" fontWeight={600}>
                      {formatDateTime(h.createdAt)}
                    </Typography>
                    <StatusChip
                      label={h.success ? 'Thành công' : 'Thất bại'}
                      tone={h.success ? 'success' : 'danger'}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" component="div">
                    {h.deviceName ?? 'Không rõ thiết bị'}
                    {h.ipAddress ? ` · ${h.ipAddress}` : ''}
                  </Typography>
                  {!h.success && h.failureReason && (
                    <Typography variant="caption" color="error.main" component="div">
                      {h.failureReason}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
            {data && data.totalElements > items.length && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button size="small" disabled={isFetching} onClick={() => setSize(50)}>
                  {size >= 50 ? 'Đã hiện 50 mục mới nhất' : 'Xem thêm'}
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Drawer>
  )
}
