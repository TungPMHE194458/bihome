import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusChip } from '@/components/StatusChip'
import { SOS_STATUS, SOS_TYPE_LABEL, playAlarm, sosPlace } from '@/features/sos/constants'
import { useActiveSos } from '@/features/sos/hooks'
import { formatDateTime } from '@/lib/format'
import { hasPermission, useAuthStore } from '@/stores/authStore'
import { brand } from '@/app/theme'

/**
 * Nút SOS trên header: badge đỏ = số cảnh báo đang mở (hỏi mỗi 15 giây), phát âm báo khi có cảnh báo mới hơn lần trước,
 * nút nhấp nháy khi còn cảnh báo chưa tiếp nhận.
 */
export function SosButton() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const allowed = hasPermission(user, 'SOS_READ')
  const canWrite = hasPermission(user, 'SOS_WRITE')
  const { data } = useActiveSos(allowed)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const lastSeen = useRef<number | null | undefined>(undefined)

  useEffect(() => {
    if (!data) return
    const latest = data.latestId ?? null
    // Lần tải đầu chỉ ghi nhận mốc; có cảnh báo mới (id lớn hơn) ở các lần hỏi sau thì phát âm báo.
    if (lastSeen.current !== undefined && latest != null && (lastSeen.current == null || latest > lastSeen.current)) {
      playAlarm()
    }
    lastSeen.current = latest
  }, [data])

  if (!allowed) return null
  const count = data?.count ?? 0
  const go = (path: string) => {
    setAnchor(null)
    navigate(path)
  }

  return (
    <>
      <Badge color="error" badgeContent={count} invisible={count === 0} overlap="circular" max={99}>
        <Button
          variant="contained"
          size="small"
          aria-label={count ? `Cảnh báo khẩn cấp SOS, ${count} đang mở` : 'Cảnh báo khẩn cấp SOS'}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            bgcolor: brand.danger,
            minWidth: 0,
            px: 1.5,
            fontWeight: 800,
            '&:hover': { bgcolor: '#B91C1C' },
            ...(data?.newCount
              ? {
                  animation: 'sos-pulse 1s ease-in-out infinite',
                  '@keyframes sos-pulse': { '0%, 100%': { boxShadow: '0 0 0 0 rgba(220,38,38,.7)' }, '50%': { boxShadow: '0 0 0 8px rgba(220,38,38,0)' } },
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                }
              : {}),
          }}
        >
          SOS
        </Button>
      </Badge>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography fontWeight={700}>Cảnh báo khẩn cấp (SOS)</Typography>
          <Typography variant="caption" color="text.secondary">
            {count ? `${count} cảnh báo đang mở` : 'Không có cảnh báo đang mở'}
          </Typography>
        </Box>
        {data?.latest.length ? (
          <List dense disablePadding sx={{ maxHeight: 360, overflowY: 'auto' }}>
            {data.latest.map((a) => (
              <ListItemButton key={a.id} onClick={() => go(`/sos-alerts?view=${a.id}`)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Typography variant="body2" fontWeight={700}>
                        {SOS_TYPE_LABEL[a.alertType]} · {sosPlace(a)}
                      </Typography>
                      <StatusChip {...SOS_STATUS[a.status]} />
                    </Stack>
                  }
                  secondary={`${a.code} · ${formatDateTime(a.createdAt)}`}
                />
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
            Không có cảnh báo khẩn cấp.
          </Typography>
        )}
        <Stack direction="row" justifyContent="space-between" sx={{ px: 2, py: 1, borderTop: 1, borderColor: 'divider' }}>
          <Button size="small" onClick={() => go('/sos-alerts')}>
            Xem tất cả
          </Button>
          {canWrite && (
            <Button size="small" color="error" onClick={() => go('/sos-alerts?create=1')}>
              Tạo cảnh báo
            </Button>
          )}
        </Stack>
      </Popover>
    </>
  )
}
