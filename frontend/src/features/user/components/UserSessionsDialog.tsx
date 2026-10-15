import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { useRevokeUserSession, useUserSessions } from '@/features/user/hooks'
import type { UserSummary } from '@/features/user/types'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'

interface Props {
  /** null = đóng. */
  user: UserSummary | null
  onClose: () => void
}

/** Thiết bị đang đăng nhập của một người dùng; đăng xuất từng thiết bị không ảnh hưởng thiết bị khác. */
export function UserSessionsDialog({ user, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const open = !!user
  const { data: sessions, isLoading, error, refetch } = useUserSessions(user?.id ?? 0, open)
  const revoke = useRevokeUserSession(user?.id ?? 0)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Thiết bị đang đăng nhập{user ? ` — ${user.username}` : ''}</DialogTitle>
      <DialogContent>
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isLoading ? (
          <Stack spacing={1.5}>
            {[0, 1].map((i) => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </Stack>
        ) : !sessions || sessions.length === 0 ? (
          <EmptyState message="Không có thiết bị nào đang đăng nhập" />
        ) : (
          <Stack spacing={1.5}>
            {sessions.map((s) => (
              <Stack key={s.id} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Stack>
                  <Typography variant="body2">{s.ipAddress ?? 'Không rõ IP'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Đăng nhập {formatDateTime(s.createdAt)}
                    {s.userAgent ? ` · ${s.userAgent}` : ''}
                  </Typography>
                </Stack>
                <Tooltip title="Đăng xuất thiết bị này">
                  <IconButton
                    size="small"
                    disabled={revoke.isPending}
                    onClick={() =>
                      revoke.mutate(s.id, {
                        onSuccess: () => enqueueSnackbar('Đã đăng xuất thiết bị.', { variant: 'success' }),
                        onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
                      })
                    }
                  >
                    <LogoutOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  )
}
