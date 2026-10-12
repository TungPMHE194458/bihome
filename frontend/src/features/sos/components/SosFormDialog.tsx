import Box from '@mui/material/Box'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { ApartmentPicker } from '@/features/apartment/components/ApartmentPicker'
import type { ApartmentOption } from '@/features/apartment/types'
import { SOS_TYPE_OPTIONS } from '@/features/sos/constants'
import { useCreateSos } from '@/features/sos/hooks'
import { emptySos, sosSchema, sosToRequest, type SosFormValues } from '@/features/sos/schema'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'

interface Props {
  open: boolean
  onClose: () => void
}

const full = { gridColumn: '1 / -1' } as const

/** BQL ghi nhận cảnh báo khẩn cấp nhận qua điện thoại / tại chỗ (app cư dân gửi trực tiếp về sau). */
export function SosFormDialog({ open, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const create = useCreateSos()
  const [apartment, setApartment] = useState<ApartmentOption | null>(null)
  const { control, handleSubmit, reset, setValue, setError, formState } = useForm<SosFormValues>({
    resolver: zodResolver(sosSchema),
    defaultValues: emptySos(),
  })

  useEffect(() => {
    if (!open) return
    setApartment(null)
    reset(emptySos())
  }, [open, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await create.mutateAsync(sosToRequest(values))
      enqueueSnackbar(`Đã tạo cảnh báo ${saved.code} và báo cho nhân viên trực.`, { variant: 'success' })
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, ['location', 'apartmentId', 'reporterPhone'])) {
        enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      }
    }
  })

  return (
    <FormDialog
      open={open}
      title="Tạo cảnh báo khẩn cấp"
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
      submitLabel="Phát cảnh báo"
    >
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <FormSelect name="alertType" control={control} label="Loại sự cố" options={SOS_TYPE_OPTIONS} required />
        <ApartmentPicker
          value={apartment}
          optional
          error={formState.errors.apartmentId?.message}
          onChange={(a) => {
            setApartment(a)
            setValue('apartmentId', a?.id ?? null, { shouldDirty: true, shouldValidate: formState.isSubmitted })
          }}
        />
        <FormTextField name="location" control={control} label="Vị trí" placeholder="VD: Thang máy số 2, tầng hầm B1" sx={full} />
        <FormTextField name="reporterName" control={control} label="Người báo" />
        <FormTextField name="reporterPhone" control={control} label="Số điện thoại" />
        <FormTextField name="description" control={control} label="Mô tả" multiline minRows={3} sx={full} />
      </Box>
    </FormDialog>
  )
}
