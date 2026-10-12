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
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { FormCheckbox } from '@/components/form/FormCheckbox'
import { FormPasswordField, FormTextField } from '@/components/form/FormTextField'
import { authApi } from '@/features/auth/api'
import { loginSchema, type LoginValues } from '@/features/auth/schema'
import { completeLogin } from '@/features/auth/session'
import { getErrorMessage } from '@/lib/apiError'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', rememberMe: false },
  })
  const info = (location.state as { info?: string } | null)?.info
  const from = (location.state as { from?: string } | null)?.from

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      const tokens = await authApi.login(values)
      await completeLogin(tokens.accessToken)
      navigate(tokens.mustChangePassword ? '/change-password' : (from ?? '/'), { replace: true })
    } catch (e) {
      setError(getErrorMessage(e))
    }
  })

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <Typography variant="h5" fontWeight={700}>
        Đăng nhập
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        Chào mừng bạn quay lại hệ thống quản lý BiHome.
      </Typography>
      <Stack spacing={2}>
        {info && !error && <Alert severity="success">{info}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <FormTextField
          name="username"
          control={control}
          label="Tên đăng nhập hoặc email"
          autoComplete="username"
          autoFocus
          required
        />
        <FormPasswordField
          name="password"
          control={control}
          label="Mật khẩu"
          autoComplete="current-password"
          required
        />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <FormCheckbox name="rememberMe" control={control} label="Ghi nhớ đăng nhập" />
          <Link component={RouterLink} to="/forgot-password" underline="hover" fontWeight={500}>
            Quên mật khẩu?
          </Link>
        </Box>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={formState.isSubmitting}
          startIcon={formState.isSubmitting ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          Đăng nhập
        </Button>
      </Stack>
    </Box>
  )
}
