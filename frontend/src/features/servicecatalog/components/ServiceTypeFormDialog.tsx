import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { AMENITY_STATUS_OPTIONS } from '@/features/amenity/constants'
import { useSaveServiceType, useServiceType } from '@/features/servicecatalog/hooks'
import {
  emptyServiceType,
  serviceTypeSchema,
  serviceTypeToForm,
  serviceTypeToRequest,
  type ServiceTypeFormValues,
} from '@/features/servicecatalog/schema'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'

interface Props {
  open: boolean
  typeId?: number
  onClose: () => void
}

export function ServiceTypeFormDialog({ open, typeId, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = typeId != null
  const { data: detail, isLoading, error: loadError, refetch } = useServiceType(open ? typeId : undefined)
  const save = useSaveServiceType()
  const { control, handleSubmit, reset, setError, formState } = useForm<ServiceTypeFormValues>({
    resolver: zodResolver(serviceTypeSchema),
    defaultValues: emptyServiceType(),
  })

  useEffect(() => {
    if (!open) return
    reset(editing && detail ? serviceTypeToForm(detail) : emptyServiceType())
  }, [open, editing, detail, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id: typeId, body: serviceTypeToRequest(values, detail?.version) })
      enqueueSnackbar(editing ? 'Đã cập nhật loại dịch vụ.' : 'Đã thêm loại dịch vụ.', { variant: 'success' })
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
      title={editing ? 'Chỉnh sửa loại dịch vụ' : 'Thêm loại dịch vụ'}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
      maxWidth="sm"
    >
      {editing && isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 2 }}>
          <FormTextField name="name" control={control} label="Tên loại dịch vụ" required placeholder="vd Vệ sinh, Sửa chữa" />
          <FormSelect name="status" control={control} label="Trạng thái" options={AMENITY_STATUS_OPTIONS} required />
          <FormTextField name="description" control={control} label="Mô tả" multiline minRows={2} />
        </Box>
      )}
    </FormDialog>
  )
}
