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
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { FormTextField } from '@/components/form/FormTextField'
import { authApi } from '@/features/auth/api'
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schema'
import { getErrorMessage } from '@/lib/apiError'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const { control, handleSubmit, formState } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null)
    try {
      await authApi.forgotPassword(email)
      navigate(`/reset-password?email=${encodeURIComponent(email)}`, {
        state: { info: 'Nếu email tồn tại trong hệ thống, mã OTP gồm 6 chữ số đã được gửi tới email đó.' },
      })
    } catch (e) {
      setError(getErrorMessage(e))
    }
  })

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <Typography variant="h5" fontWeight={700}>
        Quên mật khẩu
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Nhập email tài khoản, chúng tôi sẽ gửi mã OTP (hiệu lực 10 phút) để đặt lại mật khẩu.
      </Typography>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField name="email" control={control} label="Email" type="email" autoComplete="email" autoFocus required />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={formState.isSubmitting}
          startIcon={formState.isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          Gửi mã OTP
        </Button>
        <Link component={RouterLink} to="/login" underline="hover" textAlign="center">
          Quay lại đăng nhập
        </Link>
      </Stack>
    </Box>
  )
}
