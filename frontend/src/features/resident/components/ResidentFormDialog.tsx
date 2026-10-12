import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { AvatarUpload } from '@/components/AvatarUpload'
import { FormDialog } from '@/components/FormDialog'
import { FormDatePicker } from '@/components/form/FormDatePicker'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import type { ApartmentOption } from '@/features/apartment/types'
import { GENDER_OPTIONS } from '@/features/profile/constants'
import { ResidenceFields } from '@/features/resident/components/ResidenceFields'
import { ID_TYPE_OPTIONS } from '@/features/resident/constants'
import { useResident, useSaveResident } from '@/features/resident/hooks'
import {
  RESIDENCE_ERROR_ALIASES,
  emptyResident,
  normalizeIdNumber,
  residentSchema,
  residentToForm,
  residentToRequest,
  type ResidentFormValues,
} from '@/features/resident/schema'
import type { ResidentDetail } from '@/features/resident/types'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { useBuildingStore } from '@/stores/buildingStore'

interface ResidentFormDialogProps {
  open: boolean
  residentId?: number
  /** Thêm cư dân từ chi tiết căn hộ: chọn sẵn căn đó. */
  initialApartment?: ApartmentOption
  onClose: () => void
  onCreated?: (resident: ResidentDetail) => void
}

const full = { gridColumn: '1 / -1' } as const
const grid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } } as const

/** Thêm cư dân (kèm căn hộ đầu tiên) hoặc sửa thông tin cá nhân. */
export function ResidentFormDialog({ open, residentId, initialApartment, onClose, onCreated }: ResidentFormDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = residentId != null
  const showBuilding = useBuildingStore((s) => s.selectedBuildingId == null)
  const { data: detail, isLoading, error: loadError, refetch } = useResident(open ? residentId : undefined)
  const save = useSaveResident()
  const { control, handleSubmit, reset, setError, setValue, formState } = useForm<ResidentFormValues>({
    resolver: zodResolver(residentSchema),
    defaultValues: emptyResident(),
  })
  const fullName = useWatch({ control, name: 'fullName' })

  useEffect(() => {
    if (!open) return
    reset(editing && detail ? residentToForm(detail) : emptyResident(initialApartment ?? null))
  }, [open, editing, detail, initialApartment, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({ id: residentId, body: residentToRequest(values, detail?.version) })
      enqueueSnackbar(editing ? 'Đã cập nhật cư dân.' : `Đã thêm cư dân ${saved.code}.`, { variant: 'success' })
      onClose()
      if (!editing) onCreated?.(saved)
    } catch (e) {
      if (!applyFieldErrors(e, setError, undefined, RESIDENCE_ERROR_ALIASES)) {
        enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      }
    }
  })

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? 'Chỉnh sửa cư dân' : 'Thêm cư dân'}
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
      ) : (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '160px 1fr' } }}>
          <Box sx={{ pt: 1 }}>
            <Controller
              name="avatar"
              control={control}
              render={({ field }) => (
                <AvatarUpload
                  url={field.value?.url}
                  name={fullName}
                  purpose="RESIDENT_AVATAR"
                  size={96}
                  onUploaded={async (fileId, url) => field.onChange({ fileId, url })}
                  onRemove={async () => field.onChange(null)}
                />
              )}
            />
          </Box>
          <Box>
            <Section title="Thông tin cá nhân" first />
            <Box sx={grid}>
              <FormTextField name="fullName" control={control} label="Họ và tên" required />
              <FormTextField
                name="code"
                control={control}
                label="Mã cư dân"
                transform={(v) => v.toUpperCase()}
                helperText={editing ? undefined : 'Bỏ trống để tự sinh (CD + 6 số)'}
              />
              <FormTextField name="phone" control={control} label="Số điện thoại" required placeholder="vd 0912345678" />
              <FormTextField name="email" control={control} label="Email" />
              <FormSelect name="gender" control={control} label="Giới tính" options={GENDER_OPTIONS} emptyLabel="Không chọn" />
              <FormDatePicker name="dateOfBirth" control={control} label="Ngày sinh" disableFuture />
            </Box>

            <Section title="Giấy tờ tuỳ thân" />
            <Box sx={grid}>
              <FormSelect name="idType" control={control} label="Loại giấy tờ" options={ID_TYPE_OPTIONS} emptyLabel="Không chọn" />
              <FormTextField name="idNumber" control={control} label="Số giấy tờ" transform={normalizeIdNumber} />
              <FormDatePicker name="idIssueDate" control={control} label="Ngày cấp" disableFuture />
              <FormTextField name="idIssuePlace" control={control} label="Nơi cấp" />
              <FormTextField name="nationality" control={control} label="Quốc tịch" />
            </Box>

            {!editing && (
              <>
                <Section title="Căn hộ" />
                <ResidenceFields
                  control={control}
                  setValue={setValue}
                  prefix="residence."
                  showBuilding={showBuilding}
                />
              </>
            )}

            <Section title="Khác" />
            <Box sx={grid}>
              <Box sx={full}>
                <FormTextField name="note" control={control} label="Ghi chú" multiline minRows={2} />
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </FormDialog>
  )
}

function Section({ title, first = false }: { title: string; first?: boolean }) {
  return (
    <>
      {!first && <Divider sx={{ my: 2.5 }} />}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
        {title}
      </Typography>
    </>
  )
}
