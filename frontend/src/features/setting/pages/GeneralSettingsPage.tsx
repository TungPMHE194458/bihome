import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ErrorState } from '@/components/ErrorState'
import { FormTextField } from '@/components/form/FormTextField'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'
import { useSaveSettings, useSettings, type SystemSettings } from '@/features/setting/api'
import { settingsSchema, settingsToForm, settingsToRequest, type SettingsFormValues } from '@/features/setting/schema'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'

const FIELDS = ['companyName', 'taxCode', 'address', 'hotline', 'email', 'website', 'documentFooter', 'maxFailedLogins', 'lockMinutes']

/** Cấu hình chung: thông tin đơn vị quản lý (in trên PDF), chính sách đăng nhập, email thông báo phí. */
export function GeneralSettingsPage() {
  const { data, isLoading, error, refetch } = useSettings()
  return (
    <Stack spacing={2}>
      <PageBreadcrumb title="Cấu hình chung" />
      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <Skeleton variant="rounded" height={420} />
      ) : (
        <SettingsForm settings={data} />
      )}
    </Stack>
  )
}

function SettingsForm({ settings }: { settings: SystemSettings }) {
  const { enqueueSnackbar } = useSnackbar()
  const canWrite = usePermission('SETTING_WRITE')
  const save = useSaveSettings()
  const { control, handleSubmit, reset, setError, formState } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settingsToForm(settings),
  })
  useEffect(() => reset(settingsToForm(settings)), [settings, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync(settingsToRequest(values, settings.version))
      enqueueSnackbar('Đã lưu cấu hình chung.', { variant: 'success' })
    } catch (e) {
      if (!applyFieldErrors(e, setError, FIELDS)) enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  })

  const disabled = !canWrite
  return (
    <Stack component="form" spacing={2} onSubmit={onSubmit} noValidate>
      {!canWrite && <Alert severity="info">Bạn chỉ có quyền xem cấu hình chung.</Alert>}
      <Section title="Đơn vị quản lý" description="In trên thông báo phí và phiếu thu (dưới tên tòa nhà).">
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' } }}>
          <FormTextField name="companyName" control={control} label="Tên đơn vị" disabled={disabled} />
          <FormTextField name="taxCode" control={control} label="Mã số thuế" disabled={disabled} />
          <FormTextField name="address" control={control} label="Địa chỉ" disabled={disabled} />
          <FormTextField name="hotline" control={control} label="Hotline" disabled={disabled} />
          <FormTextField name="email" control={control} label="Email" disabled={disabled} />
          <FormTextField name="website" control={control} label="Website" disabled={disabled} />
          <Box sx={{ gridColumn: '1 / -1' }}>
            <FormTextField
              name="documentFooter"
              control={control}
              label="Chân trang thông báo phí / phiếu thu"
              placeholder="Bỏ trống = “Ban quản lý <tòa> trân trọng cảm ơn Quý cư dân.”"
              disabled={disabled}
            />
          </Box>
        </Box>
      </Section>
      <Section title="Đăng nhập" description="Áp dụng ngay cho mọi tài khoản.">
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, maxWidth: 640 }}>
          <FormTextField name="maxFailedLogins" control={control} label="Số lần nhập sai trước khi tạm khoá" disabled={disabled}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
          <FormTextField name="lockMinutes" control={control} label="Thời gian tạm khoá (phút)" disabled={disabled}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        </Box>
      </Section>
      <Section title="Thông báo phí">
        <Controller
          name="feeNoticeEmail"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} disabled={disabled} onChange={(e) => field.onChange(e.target.checked)} />}
              label="Gửi email cho cư dân khi phát hành thông báo phí"
            />
          )}
        />
      </Section>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="text.secondary">
          {settings.updatedAt ? `Cập nhật ${formatDateTime(settings.updatedAt)} bởi ${settings.updatedBy ?? ''}` : ''}
        </Typography>
        {canWrite && (
          <Button type="submit" variant="contained" size="large" disabled={formState.isSubmitting}
            startIcon={formState.isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}>
            Lưu cấu hình
          </Button>
        )}
      </Stack>
    </Stack>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }} aria-label={title}>
      <Typography fontWeight={700}>{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
      <Box sx={{ mt: 2 }}>{children}</Box>
    </Paper>
  )
}
