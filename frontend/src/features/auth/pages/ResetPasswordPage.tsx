import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link as RouterLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { FormPasswordField, FormTextField } from '@/components/form/FormTextField'
import { authApi } from '@/features/auth/api'
import { PASSWORD_MESSAGE, resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/schema'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const info = (location.state as { info?: string } | null)?.info
  const { control, handleSubmit, formState, setError: setFieldError } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: searchParams.get('email') ?? '', otp: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      await authApi.resetPassword(values)
      navigate('/login', { replace: true, state: { info: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.' } })
    } catch (e) {
      if (!applyFieldErrors(e, setFieldError)) setError(getErrorMessage(e))
    }
  })

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <Typography variant="h5" fontWeight={700}>
        Đặt lại mật khẩu
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Nhập mã OTP đã nhận qua email và mật khẩu mới.
      </Typography>
      <Stack spacing={2}>
        {info && !error && <Alert severity="info">{info}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="email" control={control} label="Email" type="email" autoComplete="email" required />
        <FormTextField
          name="otp"
          control={control}
          label="Mã OTP"
          autoComplete="one-time-code"
          required
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
        />
        <FormPasswordField name="newPassword" control={control} label="Mật khẩu mới" autoComplete="new-password" helperText={PASSWORD_MESSAGE} required />
        <FormPasswordField name="confirmPassword" control={control} label="Nhập lại mật khẩu mới" autoComplete="new-password" required />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={formState.isSubmitting}
          startIcon={formState.isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          Đặt lại mật khẩu
        </Button>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Link component={RouterLink} to="/forgot-password" underline="hover">
            Gửi lại mã OTP
          </Link>
          <Link component={RouterLink} to="/login" underline="hover">
            Quay lại đăng nhập
          </Link>
        </Box>
      </Stack>
    </Box>
  )
}
