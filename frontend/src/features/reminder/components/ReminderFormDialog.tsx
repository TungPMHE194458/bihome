import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import FormHelperText from '@mui/material/FormHelperText'
import FormLabel from '@mui/material/FormLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormDatePicker } from '@/components/form/FormDatePicker'
import { FormTextField } from '@/components/form/FormTextField'
import { RichTextEditor } from '@/components/form/RichTextEditor'
import { CHANNEL_LABEL, SCHEDULE_LABEL } from '@/features/reminder/constants'
import { useReminder, useSaveReminder } from '@/features/reminder/hooks'
import { emptyReminder, reminderSchema, reminderToForm, reminderToRequest, type ReminderFormValues } from '@/features/reminder/schema'
import type { ReminderChannel, ScheduleType } from '@/features/reminder/types'
import { AudienceFields } from '@/features/resident/components/AudienceFields'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { useBuildingStore } from '@/stores/buildingStore'

interface Props {
  open: boolean
  reminderId?: number
  onClose: () => void
}

const full = { gridColumn: '1 / -1' } as const
const FIELDS = ['title', 'content', 'audience', 'targets', 'channels', 'scheduleType', 'scheduledAt', 'monthlyDay', 'monthlyTime', 'endDate']

export function ReminderFormDialog({ open, reminderId, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = reminderId != null
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data: detail, isLoading, error: loadError, refetch } = useReminder(open ? reminderId : undefined)
  const save = useSaveReminder()
  const [draft, setDraft] = useState(false)
  const { control, handleSubmit, reset, setValue, setError, formState } = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: emptyReminder(),
  })
  const [audience, targets, scheduleType] = useWatch({ control, name: ['audience', 'targets', 'scheduleType'] })

  useEffect(() => {
    if (!open) return
    reset(editing && detail ? reminderToForm(detail) : emptyReminder())
    setDraft(editing && detail ? detail.status === 'DRAFT' : false)
  }, [open, editing, detail, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({ id: reminderId, body: reminderToRequest(values, draft, detail?.version) })
      enqueueSnackbar(
        draft
          ? 'Đã lưu nháp nhắc nhở.'
          : saved.status === 'SENT'
            ? `Đã gửi nhắc nhở tới ${saved.recipientCount} cư dân.`
            : 'Đã lên lịch gửi nhắc nhở.',
        { variant: 'success' },
      )
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, FIELDS)) enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  })

  const submitLabel = draft ? 'Lưu nháp' : scheduleType === 'NOW' ? 'Gửi ngay' : 'Lên lịch gửi'

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? 'Chỉnh sửa nhắc nhở' : 'Tạo nhắc nhở'}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
      submitLabel={submitLabel}
      maxWidth="md"
    >
      {editing && isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : !editing && buildingId == null ? (
        <Alert severity="warning">Vui lòng chọn một tòa nhà ở thanh trên cùng trước khi tạo nhắc nhở.</Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Box sx={full}>
            <FormTextField name="title" control={control} label="Tiêu đề" required slotProps={{ htmlInput: { maxLength: 200 } }} />
          </Box>
          <Box sx={full}>
            <Controller
              name="content"
              control={control}
              render={({ field, fieldState }) => (
                <RichTextEditor label="Nội dung" required value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
              )}
            />
          </Box>
          <Box sx={full}>
            <AudienceFields
              control={control}
              audienceName="audience"
              targetsName="targets"
              audience={audience}
              targets={targets}
              onAudienceChange={() => setValue('targets', [])}
            />
          </Box>
          <Box sx={full}>
            <FormLabel sx={{ fontSize: 14 }}>Kênh gửi *</FormLabel>
            <Controller
              name="channels"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <FormGroup row>
                    {(Object.keys(CHANNEL_LABEL) as ReminderChannel[]).map((c) => (
                      <FormControlLabel
                        key={c}
                        label={CHANNEL_LABEL[c]}
                        control={
                          <Checkbox
                            size="small"
                            checked={field.value.includes(c)}
                            onChange={(e) => field.onChange(e.target.checked ? [...field.value, c] : field.value.filter((x) => x !== c))}
                          />
                        }
                      />
                    ))}
                  </FormGroup>
                  <FormHelperText error={!!fieldState.error}>
                    {fieldState.error?.message ?? 'Email / SMS: môi trường thử chỉ ghi log; trong app: lưu chờ app cư dân.'}
                  </FormHelperText>
                </>
              )}
            />
          </Box>
          <Box sx={full}>
            <FormLabel sx={{ fontSize: 14 }}>Lịch gửi</FormLabel>
            <Controller
              name="scheduleType"
              control={control}
              render={({ field }) => (
                <RadioGroup row {...field}>
                  {(Object.keys(SCHEDULE_LABEL) as ScheduleType[]).map((t) => (
                    <FormControlLabel key={t} value={t} control={<Radio size="small" />} label={SCHEDULE_LABEL[t]} />
                  ))}
                </RadioGroup>
              )}
            />
          </Box>
          {scheduleType === 'ONCE' && (
            <FormTextField name="scheduledAt" control={control} label="Gửi lúc" type="datetime-local" required slotProps={{ inputLabel: { shrink: true } }} />
          )}
          {scheduleType === 'MONTHLY' && (
            <>
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                <FormTextField
                  name="monthlyDay"
                  control={control}
                  label="Ngày trong tháng"
                  required
                  transform={(v) => v.replace(/\D/g, '').slice(0, 2)}
                  helperText="Tháng ít ngày hơn gửi ngày cuối tháng"
                />
                <FormTextField
                  name="monthlyTime"
                  control={control}
                  label="Giờ gửi"
                  type="time"
                  required
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { step: 300 } }}
                />
              </Box>
              <FormDatePicker name="endDate" control={control} label="Lặp đến ngày" helperText="Bỏ trống = không giới hạn" disablePast />
            </>
          )}
          <Box sx={full}>
            <FormControlLabel
              control={<Checkbox checked={draft} onChange={(e) => setDraft(e.target.checked)} />}
              label="Lưu nháp (chưa gửi, chưa lên lịch)"
            />
          </Box>
        </Box>
      )}
    </FormDialog>
  )
}
