import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormImageUpload } from '@/components/form/FormImageUpload'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import {
  APARTMENT_STATUS_OPTIONS,
  APARTMENT_TYPE_OPTIONS,
  OWNERSHIP_TYPE_OPTIONS,
  USAGE_STATUS_OPTIONS,
} from '@/features/apartment/constants'
import { useApartment, useSaveApartment } from '@/features/apartment/hooks'
import { apartmentSchema, emptyApartment, toFormValues, toRequest, type ApartmentFormValues } from '@/features/apartment/schema'
import { useBuildingOptions } from '@/features/building/hooks'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { useBuildingStore } from '@/stores/buildingStore'

interface ApartmentFormDialogProps {
  open: boolean
  apartmentId?: number
  onClose: () => void
}

const full = { gridColumn: '1 / -1' } as const

function Section({ title }: { title: string }) {
  return (
    <Typography sx={{ ...full, fontWeight: 700, mt: 1 }} color="primary.dark">
      {title}
    </Typography>
  )
}

export function ApartmentFormDialog({ open, apartmentId, onClose }: ApartmentFormDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = apartmentId != null
  const selectedBuildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data: detail, isLoading, error: loadError, refetch } = useApartment(open ? apartmentId : undefined)
  const { data: buildings = [] } = useBuildingOptions()
  const save = useSaveApartment()
  const { control, handleSubmit, reset, setError, formState } = useForm<ApartmentFormValues>({
    resolver: zodResolver(apartmentSchema),
    defaultValues: emptyApartment(selectedBuildingId),
  })

  // Thêm mới: chỉ chọn tòa đang hoạt động. Sửa: không đổi được tòa nên hiện đúng tòa hiện tại.
  const buildingOptions = useMemo(
    () =>
      buildings
        .filter((b) => b.status === 'ACTIVE' || b.id === detail?.buildingId)
        .map((b) => ({ value: b.id.toString(), label: b.name })),
    [buildings, detail?.buildingId],
  )

  useEffect(() => {
    if (!open) return
    reset(editing ? (detail ? toFormValues(detail) : emptyApartment(selectedBuildingId)) : emptyApartment(selectedBuildingId))
  }, [open, editing, detail, selectedBuildingId, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id: apartmentId, body: toRequest(values, detail?.version) })
      enqueueSnackbar(editing ? 'Đã cập nhật căn hộ.' : 'Đã thêm căn hộ.', { variant: 'success' })
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
        <Box sx={full}>
          <FormSelect
            name="buildingId"
            control={control}
            label="Tòa nhà"
            options={buildingOptions}
            required
            disabled={editing}
            helperText={editing ? 'Không đổi được tòa nhà của căn hộ đã tạo' : undefined}
          />
        </Box>
        <FormTextField
          name="code"
          control={control}
          label="Mã căn hộ"
          required
          transform={(v) => v.toUpperCase().replace(/\s/g, '')}
          helperText="Duy nhất trong tòa nhà"
        />
        <FormTextField name="name" control={control} label="Tên căn hộ" required placeholder="vd A-12.05" />
        <FormTextField
          name="floorNo"
          control={control}
          label="Tầng"
          required
          transform={(v) => v.toUpperCase().replace(/\s/g, '')}
          placeholder="vd 12, 12A, B1"
        />
        <FormTextField
          name="area"
          control={control}
          label="Diện tích"
          required
          slotProps={{
            htmlInput: { inputMode: 'decimal' },
            input: { endAdornment: <InputAdornment position="end">m²</InputAdornment> },
          }}
        />
        <FormTextField name="bedrooms" control={control} label="Số phòng ngủ" slotProps={{ htmlInput: { inputMode: 'numeric' } }} />
        <FormTextField name="rooms" control={control} label="Số phòng" slotProps={{ htmlInput: { inputMode: 'numeric' } }} />

        <Section title="Phân loại" />
        <FormSelect name="type" control={control} label="Loại" options={APARTMENT_TYPE_OPTIONS} required />
        <FormSelect name="ownershipType" control={control} label="Hình thức" options={OWNERSHIP_TYPE_OPTIONS} required />
        <FormSelect name="usageStatus" control={control} label="Tình trạng sử dụng" options={USAGE_STATUS_OPTIONS} required />
        <FormSelect name="status" control={control} label="Trạng thái" options={APARTMENT_STATUS_OPTIONS} required />
        <Box sx={full}>
          <FormTextField name="description" control={control} label="Mô tả" multiline minRows={3} />
        </Box>
        <Box sx={full}>
          <FormImageUpload name="images" control={control} purpose="APARTMENT_IMAGE" label="Ảnh căn hộ" max={20} />
        </Box>
      </Box>
    )
  }

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? 'Chỉnh sửa căn hộ' : 'Thêm căn hộ'}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
    >
      {content}
    </FormDialog>
  )
}
