import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { FormPasswordField } from '@/components/form/FormTextField'
import { authApi } from '@/features/auth/api'
import { changePasswordSchema, PASSWORD_MESSAGE, type ChangePasswordValues } from '@/features/auth/schema'
import { completeLogin, logout } from '@/features/auth/session'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { useAuthStore } from '@/stores/authStore'

export function ChangePasswordPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const mustChange = useAuthStore((s) => s.user?.mustChangePassword ?? false)
  const [error, setError] = useState<string | null>(null)
  const { control, handleSubmit, formState, setError: setFieldError } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      const tokens = await authApi.changePassword(values)
      await completeLogin(tokens.accessToken)
      enqueueSnackbar('Đổi mật khẩu thành công. Các thiết bị khác đã bị đăng xuất.', { variant: 'success' })
      navigate('/', { replace: true })
    } catch (e) {
      if (!applyFieldErrors(e, setFieldError)) setError(getErrorMessage(e))
    }
  })

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <Typography variant="h5" fontWeight={700}>
        Đổi mật khẩu
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Sau khi đổi, các phiên đăng nhập trên thiết bị khác sẽ bị đăng xuất.
      </Typography>
      <Stack spacing={2}>
        {mustChange && (
          <Alert severity="warning">Bạn đang dùng mật khẩu tạm. Vui lòng đổi mật khẩu để tiếp tục sử dụng hệ thống.</Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <FormPasswordField name="currentPassword" control={control} label="Mật khẩu hiện tại" autoComplete="current-password" autoFocus required />
        <FormPasswordField name="newPassword" control={control} label="Mật khẩu mới" autoComplete="new-password" helperText={PASSWORD_MESSAGE} required />
        <FormPasswordField name="confirmPassword" control={control} label="Nhập lại mật khẩu mới" autoComplete="new-password" required />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={formState.isSubmitting}
          startIcon={formState.isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          Đổi mật khẩu
        </Button>
        {mustChange ? (
          <Button
            color="inherit"
            onClick={async () => {
              await logout()
              navigate('/login', { replace: true })
            }}
          >
            Đăng xuất
          </Button>
        ) : (
          <Button color="inherit" onClick={() => navigate(-1)}>
            Quay lại
          </Button>
        )}
      </Stack>
    </Box>
  )
}
