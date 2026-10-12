import { zodResolver } from '@hookform/resolvers/zod'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormImageUpload } from '@/components/form/FormImageUpload'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { BUILDING_STATUS_OPTIONS, BUILDING_TYPE_OPTIONS, VN_PROVINCES } from '@/features/building/constants'
import { useBuilding, useSaveBuilding } from '@/features/building/hooks'
import { buildingSchema, EMPTY_BUILDING, toFormValues, toRequest, type BuildingFormValues } from '@/features/building/schema'
import type { BuildingDetail } from '@/features/building/types'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'

interface BuildingFormDialogProps {
  open: boolean
  /** Có id = sửa, không có = thêm mới. */
  buildingId?: number
  onClose: () => void
  onSaved?: (building: BuildingDetail) => void
}

const full = { gridColumn: '1 / -1' } as const

function Section({ title }: { title: string }) {
  return (
    <Typography sx={{ ...full, fontWeight: 700, mt: 1 }} color="primary.dark">
      {title}
    </Typography>
  )
}

export function BuildingFormDialog({ open, buildingId, onClose, onSaved }: BuildingFormDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = buildingId != null
  const { data: detail, isLoading, error: loadError, refetch } = useBuilding(open ? buildingId : undefined)
  const save = useSaveBuilding()
  const { control, handleSubmit, reset, setError, formState } = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
    defaultValues: EMPTY_BUILDING,
  })

  useEffect(() => {
    if (!open) return
    reset(editing ? (detail ? toFormValues(detail) : EMPTY_BUILDING) : EMPTY_BUILDING)
  }, [open, editing, detail, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({ id: buildingId, body: toRequest(values, detail?.version) })
      enqueueSnackbar(editing ? 'Đã cập nhật tòa nhà.' : 'Đã thêm tòa nhà.', { variant: 'success' })
      onSaved?.(saved)
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError)) enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  })

  let content: ReactNode
  if (editing && isLoading) {
    content = (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    )
  } else {
    content = (
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <Section title="Thông tin chung" />
        <FormTextField
          name="code"
          control={control}
          label="Mã tòa nhà"
          required
          transform={(v) => v.toUpperCase().replace(/\s/g, '')}
          helperText="Chữ in hoa không dấu, không khoảng trắng"
        />
        <FormTextField name="name" control={control} label="Tên tòa nhà" required />
        <FormSelect name="type" control={control} label="Loại" options={BUILDING_TYPE_OPTIONS} required />
        <FormSelect name="status" control={control} label="Trạng thái" options={BUILDING_STATUS_OPTIONS} required />

        <Section title="Vị trí" />
        <Controller
          name="province"
          control={control}
          render={({ field, fieldState }) => (
            <Autocomplete
              freeSolo
              options={VN_PROVINCES}
              value={field.value}
              inputValue={field.value}
              onInputChange={(_, v) => field.onChange(v)}
              onChange={(_, v) => field.onChange(v ?? '')}
              onBlur={field.onBlur}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={field.ref}
                  label="Tỉnh/Thành phố"
                  required
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          )}
        />
        <FormTextField name="ward" control={control} label="Phường/Xã" required />
        <Box sx={full}>
          <FormTextField name="addressDetail" control={control} label="Địa chỉ chi tiết" required placeholder="Số nhà, tên đường..." />
        </Box>

        <Section title="Quy mô & liên hệ" />
        <FormTextField name="floorsAbove" control={control} label="Số tầng nổi" slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        <FormTextField name="floorsBelow" control={control} label="Số tầng hầm" slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        <Box sx={full}>
          <FormTextField name="investor" control={control} label="Chủ đầu tư" />
        </Box>
        <FormTextField name="hotline" control={control} label="Hotline BQL" />
        <FormTextField name="managementEmail" control={control} label="Email BQL" type="email" />
        <Box sx={full}>
          <FormTextField name="description" control={control} label="Mô tả" multiline minRows={3} />
        </Box>
        <Box sx={full}>
          <FormImageUpload name="images" control={control} purpose="BUILDING_IMAGE" label="Ảnh tòa nhà" max={20} />
        </Box>
      </Box>
    )
  }

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? 'Chỉnh sửa tòa nhà' : 'Thêm tòa nhà'}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
    >
      {content}
    </FormDialog>
  )
}
