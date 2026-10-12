import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormImageUpload } from '@/components/form/FormImageUpload'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { AMENITY_STATUS_OPTIONS } from '@/features/amenity/constants'
import { useBuildingOptions } from '@/features/building/hooks'
import { useSaveService, useService, useServiceTypeOptions } from '@/features/servicecatalog/hooks'
import {
  UNIT_SUGGESTIONS,
  emptyService,
  serviceSchema,
  serviceToForm,
  serviceToRequest,
  type ServiceFormValues,
} from '@/features/servicecatalog/schema'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { useBuildingStore } from '@/stores/buildingStore'

interface Props {
  open: boolean
  serviceId?: number
  onClose: () => void
}

const full = { gridColumn: '1 / -1' } as const

export function ServiceFormDialog({ open, serviceId, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = serviceId != null
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const building = useBuildingOptions().data?.find((b) => b.id === buildingId)
  const { data: detail, isLoading, error: loadError, refetch } = useService(open ? serviceId : undefined)
  const { data: types = [] } = useServiceTypeOptions(open)
  const save = useSaveService()
  const { control, handleSubmit, reset, setError, formState } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: emptyService(),
  })

  // Loại hiện tại có thể đã ngừng hoạt động: vẫn hiện để giữ nguyên.
  const typeOptions = useMemo(() => {
    const list = types.map((t) => ({ value: String(t.id), label: t.name }))
    if (detail && !list.some((o) => o.value === String(detail.serviceTypeId))) {
      list.unshift({ value: String(detail.serviceTypeId), label: `${detail.serviceTypeName} (ngừng hoạt động)` })
    }
    return list
  }, [types, detail])

  useEffect(() => {
    if (!open) return
    reset(editing && detail ? serviceToForm(detail) : emptyService())
  }, [open, editing, detail, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({ id: serviceId, body: serviceToRequest(values, detail?.version) })
      enqueueSnackbar(editing ? 'Đã cập nhật dịch vụ.' : `Đã thêm dịch vụ ${saved.code}.`, { variant: 'success' })
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError)) enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  })

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? `Chỉnh sửa dịch vụ ${detail?.code ?? ''}` : 'Thêm dịch vụ'}
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
        <Alert severity="warning">Vui lòng chọn một tòa nhà ở thanh trên cùng trước khi thêm dịch vụ.</Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <FormTextField name="name" control={control} label="Tên dịch vụ" required placeholder="vd Vệ sinh căn hộ 2PN" />
          <FormTextField
            name="code"
            control={control}
            label="Mã dịch vụ"
            transform={(v) => v.toUpperCase()}
            helperText={editing ? undefined : 'Bỏ trống để tự sinh (DV0001…)'}
          />
          <FormSelect name="serviceTypeId" control={control} label="Loại dịch vụ" options={typeOptions} required />
          <FormSelect name="status" control={control} label="Trạng thái" options={AMENITY_STATUS_OPTIONS} required />
          <FormTextField
            name="unitPrice"
            control={control}
            label="Đơn giá"
            required
            transform={(v) => v.replace(/\D/g, '')}
            slotProps={{ input: { endAdornment: <InputAdornment position="end">đ</InputAdornment> } }}
          />
          <Controller
            name="unit"
            control={control}
            render={({ field, fieldState }) => (
              <Autocomplete
                freeSolo
                options={UNIT_SUGGESTIONS}
                value={field.value}
                inputValue={field.value}
                onInputChange={(_, v) => field.onChange(v)}
                onChange={(_, v) => field.onChange(v ?? '')}
                renderInput={(p) => (
                  <TextField
                    {...p}
                    label="Đơn vị tính"
                    required
                    inputRef={field.ref}
                    onBlur={field.onBlur}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message ?? 'vd lần, giờ, m², kg'}
                  />
                )}
              />
            )}
          />
          <Box sx={full}>
            <FormTextField name="description" control={control} label="Mô tả" multiline minRows={3} />
          </Box>
          <Box sx={full}>
            <FormImageUpload name="images" control={control} purpose="SERVICE_IMAGE" label="Ảnh dịch vụ" max={20} />
          </Box>
          {!editing && building && (
            <Alert severity="info" sx={full}>
              Dịch vụ thuộc tòa nhà <b>{building.name}</b>.
            </Alert>
          )}
        </Box>
      )}
    </FormDialog>
  )
}
