import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { AttachmentList } from '@/components/form/AttachmentList'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { useBuildingOptions } from '@/features/building/hooks'
import { useAnnouncement, useSaveAnnouncement, useSendAnnouncement } from '@/features/notification/api'
import { AUDIENCE_OPTIONS, CATEGORY_OPTIONS } from '@/features/notification/constants'
import {
  announcementSchema,
  announcementToForm,
  announcementToRequest,
  emptyAnnouncement,
  type AnnouncementFormValues,
} from '@/features/notification/schema'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { useBuildingStore } from '@/stores/buildingStore'

interface Props {
  open: boolean
  announcementId?: number
  onClose: () => void
}

const full = { gridColumn: '1 / -1' } as const
const SUBMIT_LABEL = { DRAFT: 'Lưu nháp', SCHEDULED: 'Hẹn giờ gửi', NOW: 'Gửi ngay' } as const

export function AnnouncementFormDialog({ open, announcementId, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = announcementId != null
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const building = useBuildingOptions().data?.find((b) => b.id === buildingId)
  const { data: detail, isLoading, error: loadError, refetch } = useAnnouncement(open ? announcementId : undefined)
  const save = useSaveAnnouncement()
  const send = useSendAnnouncement()
  const { control, handleSubmit, reset, setError, formState } = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: emptyAnnouncement(),
  })
  const mode = useWatch({ control, name: 'mode' })
  const audience = useWatch({ control, name: 'audience' })

  useEffect(() => {
    if (!open) return
    reset(editing && detail ? announcementToForm(detail) : emptyAnnouncement())
  }, [open, editing, detail, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({ id: announcementId, body: announcementToRequest(values, detail?.version) })
      if (values.mode === 'NOW') {
        const sent = await send.mutateAsync({ id: saved.id, version: saved.version })
        enqueueSnackbar(
          `Đã gửi thông báo${sent.audience !== 'RESIDENT' ? ` tới ${sent.staffCount} nhân viên` : ''}${
            sent.audience !== 'STAFF' ? ` · ${sent.residentCount} cư dân sẽ nhận qua app` : ''
          }.`,
          { variant: 'success' },
        )
      } else {
        enqueueSnackbar(values.mode === 'SCHEDULED' ? 'Đã hẹn giờ gửi thông báo.' : 'Đã lưu nháp thông báo.', { variant: 'success' })
      }
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, ['title', 'content', 'category', 'audience', 'scheduledAt'], { fileIds: 'files' })) {
        enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      }
    }
  })

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? 'Chỉnh sửa thông báo' : 'Soạn thông báo'}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
      submitLabel={SUBMIT_LABEL[mode]}
      maxWidth="md"
    >
      {editing && isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : !editing && buildingId == null ? (
        <Alert severity="warning">Vui lòng chọn một tòa nhà ở thanh trên cùng trước khi soạn thông báo.</Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Box sx={full}>
            <FormTextField name="title" control={control} label="Tiêu đề" required slotProps={{ htmlInput: { maxLength: 200 } }} />
          </Box>
          <FormSelect name="category" control={control} label="Loại thông báo" options={CATEGORY_OPTIONS} required />
          <FormSelect name="audience" control={control} label="Gửi tới" options={AUDIENCE_OPTIONS} required />
          <Box sx={full}>
            <FormTextField name="content" control={control} label="Nội dung" required multiline minRows={6} slotProps={{ htmlInput: { maxLength: 4000 } }} />
          </Box>
          <Box sx={full}>
            <Controller
              name="files"
              control={control}
              render={({ field, fieldState }) => (
                <AttachmentList
                  value={field.value}
                  onChange={field.onChange}
                  purpose="ANNOUNCEMENT_ATTACHMENT"
                  label="Đính kèm tệp"
                  error={fieldState.error?.message}
                />
              )}
            />
          </Box>
          <Box sx={full}>
            <FormLabel sx={{ fontSize: 14 }}>Thời điểm gửi</FormLabel>
            <Controller
              name="mode"
              control={control}
              render={({ field }) => (
                <RadioGroup row {...field}>
                  <FormControlLabel value="DRAFT" control={<Radio size="small" />} label="Lưu nháp" />
                  <FormControlLabel value="NOW" control={<Radio size="small" />} label="Gửi ngay" />
                  <FormControlLabel value="SCHEDULED" control={<Radio size="small" />} label="Hẹn giờ" />
                </RadioGroup>
              )}
            />
          </Box>
          {mode === 'SCHEDULED' && (
            <FormTextField
              name="scheduledAt"
              control={control}
              label="Gửi lúc"
              type="datetime-local"
              required
              slotProps={{ inputLabel: { shrink: true } }}
            />
          )}
          <Alert severity="info" sx={full}>
            {audience !== 'RESIDENT' && (
              <>
                Nhân viên làm việc ở tòa <b>{detail?.buildingName ?? building?.name}</b> nhận thông báo ngay trên chuông của hệ thống.{' '}
              </>
            )}
            {audience !== 'STAFF' && 'Cư dân sẽ nhận qua app cư dân (đang phát triển); hệ thống ghi nhận số cư dân lúc gửi.'}
          </Alert>
        </Box>
      )}
    </FormDialog>
  )
}
