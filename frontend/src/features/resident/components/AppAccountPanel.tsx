import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined'
import HistoryIcon from '@mui/icons-material/History'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { Can } from '@/components/Can'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { StatusChip } from '@/components/StatusChip'
import { residentApi } from '@/features/resident/api'
import { APP_ACCOUNT_STATUS } from '@/features/resident/constants'
import { LoginHistoryDrawer } from '@/features/resident/components/LoginHistoryDrawer'
import { useAppAccount, useAppAccountAction, useAppSessions, useRevokeAppSession } from '@/features/resident/hooks'
import type { AppAccountPassword, ResidentDetail } from '@/features/resident/types'
import { TemporaryPasswordDialog } from '@/features/user/components/TemporaryPasswordDialog'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'

type Pending = 'lock' | 'delete' | null

/** Tài khoản app cư dân: BQL cấp (đăng nhập bằng SĐT, mật khẩu tạm hiện một lần), khoá / mở khoá, đặt lại, xoá. */
export function AppAccountPanel({ resident }: { resident: ResidentDetail }) {
  const { enqueueSnackbar } = useSnackbar()
  const hasAccount = resident.appAccountStatus !== 'NONE'
  const { data: account, isLoading } = useAppAccount(resident.id, hasAccount)
  const [password, setPassword] = useState<{ username: string; password: string; title: string } | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  const create = useAppAccountAction(resident.id, residentApi.createAppAccount)
  const reset = useAppAccountAction(resident.id, residentApi.resetAppPassword)
  const lock = useAppAccountAction(resident.id, residentApi.lockAppAccount)
  const unlock = useAppAccountAction(resident.id, residentApi.unlockAppAccount)
  const remove = useAppAccountAction(resident.id, residentApi.deleteAppAccount)
  const { data: sessions = [] } = useAppSessions(resident.id, hasAccount)
  const revokeSession = useRevokeAppSession(resident.id)
  const living = resident.residenceStatus !== 'MOVED_OUT'

  const showPassword = (title: string) => (r: AppAccountPassword) =>
    setPassword({ username: r.phone, password: r.temporaryPassword, title })
  const fail = (e: unknown) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
  const done = (message: string) => () => {
    setPending(null)
    enqueueSnackbar(message, { variant: 'success' })
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PhoneIphoneOutlinedIcon fontSize="small" color="action" />
            <Typography variant="subtitle1" fontWeight={700}>
              Tài khoản app cư dân
            </Typography>
            <StatusChip {...APP_ACCOUNT_STATUS[resident.appAccountStatus]} />
          </Stack>
          {!hasAccount ? (
            <Typography variant="body2" color="text.secondary">
              Cư dân đăng nhập app BiHome bằng số điện thoại {resident.phone}. Mật khẩu tạm hiện một lần sau khi tạo.
            </Typography>
          ) : isLoading ? (
            <Skeleton width={280} />
          ) : account ? (
            <Typography variant="body2" color="text.secondary">
              Đăng nhập: <b>{account.phone}</b>
              {account.mustChangePassword ? ' · chưa đổi mật khẩu tạm' : ''}
              {' · '}
              {account.lastLoginAt ? `đăng nhập gần nhất ${formatDateTime(account.lastLoginAt)}` : 'chưa đăng nhập'}
            </Typography>
          ) : null}
        </Stack>
        <Can permission="RESIDENT_WRITE">
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {!hasAccount ? (
              <Button
                variant="contained"
                startIcon={<PhoneIphoneOutlinedIcon />}
                disabled={!living || create.isPending}
                onClick={() => create.mutate(undefined, { onSuccess: showPassword('Đã tạo tài khoản app'), onError: fail })}
              >
                Tạo tài khoản app
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  startIcon={<LockResetOutlinedIcon />}
                  disabled={reset.isPending}
                  onClick={() => reset.mutate(undefined, { onSuccess: showPassword('Đã đặt lại mật khẩu app'), onError: fail })}
                >
                  Đặt lại mật khẩu
                </Button>
                {resident.appAccountStatus === 'LOCKED' ? (
                  <Button
                    variant="outlined"
                    startIcon={<LockOpenOutlinedIcon />}
                    disabled={unlock.isPending}
                    onClick={() => unlock.mutate(undefined, { onSuccess: done('Đã mở khoá tài khoản app.'), onError: fail })}
                  >
                    Mở khoá
                  </Button>
                ) : (
                  <Button variant="outlined" color="warning" startIcon={<LockOutlinedIcon />} onClick={() => setPending('lock')}>
                    Khoá
                  </Button>
                )}
                <Button variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setPending('delete')}>
                  Xoá tài khoản
                </Button>
              </>
            )}
          </Stack>
        </Can>
      </Stack>

      {hasAccount && sessions.length > 0 && (
        <Stack spacing={1} sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <DevicesOutlinedIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" fontWeight={700}>
                Thiết bị đang đăng nhập ({sessions.length})
              </Typography>
            </Stack>
            <Button size="small" startIcon={<HistoryIcon fontSize="small" />} onClick={() => setHistoryOpen(true)}>
              Xem lịch sử đăng nhập
            </Button>
          </Stack>
          {sessions.map((s) => (
            <Stack key={s.id} direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {s.deviceName ?? 'Không rõ thiết bị'} ·{' '}
                {s.lastUsedAt ? `dùng gần nhất ${formatDateTime(s.lastUsedAt)}` : `đăng nhập ${formatDateTime(s.createdAt)}`}
              </Typography>
              <Can permission="RESIDENT_WRITE">
                <Tooltip title="Đăng xuất thiết bị này">
                  <IconButton
                    size="small"
                    disabled={revokeSession.isPending}
                    onClick={() =>
                      revokeSession.mutate(s.id, {
                        onSuccess: () => enqueueSnackbar('Đã đăng xuất thiết bị.', { variant: 'success' }),
                        onError: fail,
                      })
                    }
                  >
                    <LogoutOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Can>
            </Stack>
          ))}
        </Stack>
      )}
      {hasAccount && sessions.length === 0 && (
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
          <Button size="small" startIcon={<HistoryIcon fontSize="small" />} onClick={() => setHistoryOpen(true)}>
            Xem lịch sử đăng nhập
          </Button>
        </Stack>
      )}

      <ConfirmDialog
        open={pending === 'lock'}
        title="Khoá tài khoản app?"
        message="Cư dân bị đăng xuất khỏi mọi thiết bị và không đăng nhập được cho tới khi mở khoá."
        confirmLabel="Khoá"
        variant="danger"
        loading={lock.isPending}
        onConfirm={() => lock.mutate(undefined, { onSuccess: done('Đã khoá tài khoản app.'), onError: fail })}
        onClose={() => setPending(null)}
      />
      <ConfirmDialog
        open={pending === 'delete'}
        title="Xoá tài khoản app?"
        message="Cư dân không đăng nhập app được nữa; hồ sơ cư trú, phí, yêu cầu vẫn giữ. Có thể tạo lại tài khoản sau."
        confirmLabel="Xoá"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() => remove.mutate(undefined, { onSuccess: done('Đã xoá tài khoản app.'), onError: fail })}
        onClose={() => setPending(null)}
      />
      <TemporaryPasswordDialog value={password} onClose={() => setPassword(null)} />
      <LoginHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} residentId={resident.id} />
    </Paper>
  )
}
