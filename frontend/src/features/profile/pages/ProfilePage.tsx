import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useForm } from 'react-hook-form'
import { FormDatePicker } from '@/components/form/FormDatePicker'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'
import type { Me } from '@/features/auth/types'
import { profileApi } from '@/features/profile/api'
import { AvatarUpload } from '@/components/AvatarUpload'
import { GENDER_OPTIONS } from '@/features/profile/constants'
import { profileSchema, type ProfileValues } from '@/features/profile/schema'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { useAuthStore } from '@/stores/authStore'

const nullIfBlank = (v: string) => (v.trim() ? v.trim() : null)

function toValues(me: Me): ProfileValues {
  const p = me.profile
  return {
    fullName: p.fullName,
    phone: me.phone ?? '',
    gender: p.gender ?? '',
    dateOfBirth: p.dateOfBirth ?? '',
    jobTitle: p.jobTitle ?? '',
    department: p.department ?? '',
    address: p.address ?? '',
    bio: p.bio ?? '',
  }
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  if (!user) return null
  return <ProfileContent user={user} />
}

function ProfileContent({ user }: { user: Me }) {
  const { enqueueSnackbar } = useSnackbar()
  const setUser = useAuthStore((s) => s.setUser)
  const { control, handleSubmit, formState, reset, setError } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toValues(user),
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const me = await profileApi.update({
        fullName: values.fullName.trim(),
        phone: nullIfBlank(values.phone),
        gender: values.gender || null,
        dateOfBirth: values.dateOfBirth || null,
        jobTitle: nullIfBlank(values.jobTitle),
        department: nullIfBlank(values.department),
        address: nullIfBlank(values.address),
        bio: nullIfBlank(values.bio),
      })
      setUser(me)
      reset(toValues(me))
      enqueueSnackbar('Đã cập nhật hồ sơ.', { variant: 'success' })
    } catch (e) {
      if (!applyFieldErrors(e, setError)) enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  })

  const updateAvatar = async (fileId: number | null) => {
    const me = await profileApi.changeAvatar(fileId)
    setUser(me)
    enqueueSnackbar(fileId ? 'Đã cập nhật ảnh đại diện.' : 'Đã gỡ ảnh đại diện.', { variant: 'success' })
  }

  return (
    <Stack spacing={2}>
      <PageBreadcrumb title="Hồ sơ cá nhân" showActions={false} />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, alignItems: 'start' }}>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack spacing={2} alignItems="center" textAlign="center">
            <AvatarUpload
              url={user.profile.avatarUrl}
              name={user.profile.fullName}
              onUploaded={(id) => updateAvatar(id)}
              onRemove={() => updateAvatar(null)}
            />
            <Box>
              <Typography fontWeight={700}>{user.profile.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">
                @{user.username}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="center" useFlexGap>
              {user.roles.map((r) => (
                <Chip key={r.code} label={r.name} size="small" color="primary" variant="outlined" />
              ))}
            </Stack>
            {user.lastLoginAt && (
              <Typography variant="caption" color="text.secondary">
                Đăng nhập gần nhất: {formatDateTime(user.lastLoginAt)}
              </Typography>
            )}
          </Stack>
        </Paper>
        <Paper variant="outlined" component="form" onSubmit={onSubmit} noValidate sx={{ p: 3 }}>
          <Typography fontWeight={700} sx={{ mb: 2 }}>
            Thông tin cá nhân
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField label="Tên đăng nhập" value={user.username} disabled fullWidth />
            <TextField label="Email" value={user.email} disabled fullWidth />
            <FormTextField name="fullName" control={control} label="Họ và tên" required />
            <FormTextField name="phone" control={control} label="Số điện thoại" />
            <FormSelect name="gender" control={control} label="Giới tính" options={GENDER_OPTIONS} emptyLabel="Chưa chọn" />
            <FormDatePicker name="dateOfBirth" control={control} label="Ngày sinh" disableFuture />
            <FormTextField name="jobTitle" control={control} label="Chức vụ" />
            <FormTextField name="department" control={control} label="Phòng ban" />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <FormTextField name="address" control={control} label="Địa chỉ" />
            </Box>
            <Box sx={{ gridColumn: '1 / -1' }}>
              <FormTextField name="bio" control={control} label="Giới thiệu" multiline minRows={3} />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
            <Button color="inherit" disabled={!formState.isDirty || formState.isSubmitting} onClick={() => reset(toValues(user))}>
              Huỷ thay đổi
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!formState.isDirty || formState.isSubmitting}
              startIcon={formState.isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              Lưu
            </Button>
          </Box>
        </Paper>
      </Box>
    </Stack>
  )
}
