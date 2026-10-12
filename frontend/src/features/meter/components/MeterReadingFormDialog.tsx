import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormImageUpload } from '@/components/form/FormImageUpload'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { ApartmentPicker } from '@/features/apartment/components/ApartmentPicker'
import type { ApartmentOption } from '@/features/apartment/types'
import { METER_TYPE_LABEL, METER_TYPE_OPTIONS, METER_UNIT, isSpike } from '@/features/meter/constants'
import { useMeterReading, usePreviousReading, useSaveMeterReading } from '@/features/meter/hooks'
import { emptyMeter, meterSchema, meterToForm, meterToRequest, parseIndex, type MeterFormValues } from '@/features/meter/schema'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { formatNumber } from '@/lib/format'
import { formatPeriod, periodOptions } from '@/lib/period'

interface Props {
  open: boolean
  readingId?: number
  defaultPeriod: string
  onClose: () => void
}

const full = { gridColumn: '1 / -1' } as const

/** Thêm / sửa chỉ số đồng hồ; chỉ số cũ lấy từ kỳ trước (chỉ nhập tay ở kỳ đầu). */
export function MeterReadingFormDialog({ open, readingId, defaultPeriod, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = readingId != null
  const { data: detail, error: loadError, refetch } = useMeterReading(open ? readingId : undefined)
  const save = useSaveMeterReading()
  const [apartment, setApartment] = useState<ApartmentOption | null>(null)
  const { control, handleSubmit, reset, setValue, setError, formState } = useForm<MeterFormValues>({
    resolver: zodResolver(meterSchema),
    defaultValues: emptyMeter(defaultPeriod),
  })
  const [apartmentId, period, meterType, oldIndex, newIndex] = useWatch({
    control,
    name: ['apartmentId', 'period', 'meterType', 'oldIndex', 'newIndex'],
  })
  const { data: prev } = usePreviousReading(apartmentId ?? undefined, meterType, period, open && !editing)

  useEffect(() => {
    if (!open) return
    setApartment(null)
    reset(editing && detail ? meterToForm(detail) : emptyMeter(defaultPeriod))
  }, [open, editing, detail, defaultPeriod, reset])

  // Kỳ trước có số liệu → chỉ số cũ cố định theo kỳ trước.
  useEffect(() => {
    if (!editing && prev) setValue('oldIndex', prev.oldIndex == null ? '' : String(prev.oldIndex))
  }, [editing, prev, setValue])

  const oldEditable = editing ? !!detail?.firstReading : prev?.oldIndex == null
  const average = editing ? detail?.averageConsumption : prev?.averageConsumption
  const next = parseIndex(newIndex)
  const old = oldIndex.trim() ? parseIndex(oldIndex) : 0
  const consumption = next != null && old != null ? next - old : null
  const unit = METER_UNIT[meterType]

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id: readingId, body: meterToRequest(values, oldEditable, detail?.version) })
      enqueueSnackbar(editing ? 'Đã cập nhật số liệu.' : 'Đã thêm số liệu.', { variant: 'success' })
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, ['newIndex', 'oldIndex', 'period', 'apartmentId', 'imageFileId'])) {
        enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      }
    }
  })

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? `Sửa số liệu ${detail?.apartmentCode ?? ''}` : 'Thêm số liệu'}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
    >
      {editing && !detail ? (
        <Skeleton variant="rounded" height={260} />
      ) : (
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        {editing ? (
          <Typography sx={full}>
            Căn <b>{detail?.apartmentCode}</b> · {detail ? METER_TYPE_LABEL[detail.meterType] : ''} · kỳ {formatPeriod(detail?.period)}
          </Typography>
        ) : (
          <>
            <Box sx={full}>
              <ApartmentPicker
                value={apartment}
                error={formState.errors.apartmentId?.message}
                onChange={(a) => {
                  setApartment(a)
                  setValue('apartmentId', a?.id ?? null, { shouldValidate: formState.isSubmitted, shouldDirty: true })
                }}
              />
            </Box>
            <FormSelect name="period" control={control} label="Kỳ" options={periodOptions(12)} required />
            <FormSelect name="meterType" control={control} label="Loại đồng hồ" options={METER_TYPE_OPTIONS} required />
          </>
        )}
        {prev?.existingId && !editing && (
          <Alert severity="warning" sx={full}>
            Căn đã có chỉ số {METER_TYPE_LABEL[meterType].toLowerCase()} kỳ {formatPeriod(period)}, hãy sửa bản ghi đó.
          </Alert>
        )}
        {prev?.locked && !editing && (
          <Alert severity="error" sx={full}>
            Kỳ {formatPeriod(period)} đã phát hành thông báo phí, không thêm được số liệu.
          </Alert>
        )}
        <FormTextField
          name="oldIndex"
          control={control}
          label={`Chỉ số cũ (${unit})`}
          disabled={!oldEditable}
          helperText={
            oldEditable ? 'Kỳ đầu của đồng hồ: nhập chỉ số ban đầu' : prev?.previousPeriod ? `Theo kỳ ${formatPeriod(prev.previousPeriod)}` : 'Theo kỳ trước'
          }
          slotProps={{ htmlInput: { inputMode: 'decimal' } }}
        />
        <FormTextField
          name="newIndex"
          control={control}
          label={`Chỉ số mới (${unit})`}
          required
          autoFocus={editing}
          slotProps={{ htmlInput: { inputMode: 'decimal' } }}
        />
        <Box sx={full}>
          {consumption != null && consumption >= 0 && (
            <Typography variant="body2">
              Tiêu thụ: <b>{formatNumber(consumption)} {unit}</b>
              {average != null && ` · trung bình 3 kỳ trước ${formatNumber(average)} ${unit}`}
            </Typography>
          )}
          {isSpike(consumption, average) && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Tiêu thụ tăng hơn 200% so với trung bình 3 kỳ trước — kiểm tra lại chỉ số hoặc đính kèm ảnh đồng hồ.
            </Alert>
          )}
        </Box>
        <Box sx={full}>
          <FormImageUpload name="images" control={control} purpose="METER_IMAGE" label="Ảnh đồng hồ" max={1} />
        </Box>
        <FormTextField name="note" control={control} label="Ghi chú" multiline minRows={2} sx={full} />
      </Box>
      )}
    </FormDialog>
  )
}
