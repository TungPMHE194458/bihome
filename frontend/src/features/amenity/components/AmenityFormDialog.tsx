import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormCheckbox } from '@/components/form/FormCheckbox'
import { FormImageUpload } from '@/components/form/FormImageUpload'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { AMENITY_STATUS_OPTIONS } from '@/features/amenity/constants'
import { useAmenity, useSaveAmenity } from '@/features/amenity/hooks'
import { amenitySchema, amenityToForm, amenityToRequest, emptyAmenity, type AmenityFormValues } from '@/features/amenity/schema'
import { useBuildingOptions } from '@/features/building/hooks'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { useBuildingStore } from '@/stores/buildingStore'

interface Props {
  open: boolean
  amenityId?: number
  onClose: () => void
}

const full = { gridColumn: '1 / -1' } as const
const timeProps = { inputLabel: { shrink: true }, htmlInput: { step: 300 } }
// Lỗi khác trường form (vd khung giờ nằm ngoài giờ mở cửa mới) thì hiện toast.
const FORM_FIELDS = Object.keys(emptyAmenity())

export function AmenityFormDialog({ open, amenityId, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = amenityId != null
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const building = useBuildingOptions().data?.find((b) => b.id === buildingId)
  const { data: detail, isLoading, error: loadError, refetch } = useAmenity(open ? amenityId : undefined)
  const save = useSaveAmenity()
  const { control, handleSubmit, reset, setError, formState } = useForm<AmenityFormValues>({
    resolver: zodResolver(amenitySchema),
    defaultValues: emptyAmenity(),
  })

  useEffect(() => {
    if (!open) return
    reset(editing && detail ? amenityToForm(detail) : emptyAmenity())
  }, [open, editing, detail, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({ id: amenityId, body: amenityToRequest(values, detail?.version) })
      enqueueSnackbar(
        editing ? 'Đã cập nhật tiện ích.' : `Đã thêm tiện ích ${saved.code} — hãy cấu hình khung giờ để mở đặt chỗ.`,
        { variant: 'success' },
      )
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, FORM_FIELDS)) enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  })

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? 'Chỉnh sửa tiện ích' : 'Thêm tiện ích'}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
      maxWidth="md"
    >
      {editing && isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : !editing && buildingId == null ? (
        <Alert severity="warning">Vui lòng chọn một tòa nhà ở thanh trên cùng trước khi thêm tiện ích.</Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <FormTextField name="name" control={control} label="Tên tiện ích" required placeholder="vd Hồ bơi, Phòng gym" />
          <FormTextField name="code" control={control} label="Mã" required transform={(v) => v.toUpperCase()} />
          <FormTextField name="location" control={control} label="Vị trí trong tòa" placeholder="vd Tầng 5, khối A" />
          <FormTextField
            name="capacity"
            control={control}
            label="Sức chứa"
            required
            slotProps={{ input: { endAdornment: <InputAdornment position="end">người</InputAdornment> } }}
          />
          <FormTextField name="openTime" control={control} label="Giờ mở cửa" type="time" required slotProps={timeProps} />
          <FormTextField name="closeTime" control={control} label="Giờ đóng cửa" type="time" required slotProps={timeProps} />
          <FormSelect name="status" control={control} label="Trạng thái" options={AMENITY_STATUS_OPTIONS} required />
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormCheckbox name="requiresApproval" control={control} label="Cần ban quản lý duyệt khi đăng ký" />
          </Box>
          <Box sx={full}>
            <FormTextField name="rules" control={control} label="Nội quy" multiline minRows={3} />
          </Box>
          <Box sx={full}>
            <FormImageUpload name="images" control={control} purpose="AMENITY_IMAGE" label="Ảnh tiện ích" max={20} />
          </Box>
          {!editing && building && (
            <Alert severity="info" sx={full}>
              Tiện ích thuộc tòa nhà <b>{building.name}</b>. Sau khi thêm, vào <b>Cấu hình tiện ích</b> để đặt khung giờ và giá.
            </Alert>
          )}
        </Box>
      )}
    </FormDialog>
  )
}
