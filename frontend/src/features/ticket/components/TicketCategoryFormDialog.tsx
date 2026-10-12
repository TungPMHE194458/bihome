import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { CATEGORY_STATUS_OPTIONS } from '@/features/ticket/constants'
import { useCategoryAssignees, useSaveTicketCategory, useTicketCategory } from '@/features/ticket/hooks'
import { categorySchema, categoryToForm, categoryToRequest, emptyCategory, type CategoryFormValues } from '@/features/ticket/schema'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'

interface Props {
  open: boolean
  categoryId?: number
  onClose: () => void
}

const hoursAdornment = { input: { endAdornment: <InputAdornment position="end">giờ</InputAdornment> } }

export function TicketCategoryFormDialog({ open, categoryId, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = categoryId != null
  const { data: detail, isLoading, error: loadError, refetch } = useTicketCategory(open ? categoryId : undefined)
  const { data: assignees = [] } = useCategoryAssignees(open)
  const save = useSaveTicketCategory()
  const { control, handleSubmit, reset, setError, formState } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: emptyCategory(),
  })

  // Người phụ trách hiện tại có thể đã bị khoá: vẫn hiện để giữ nguyên.
  const assigneeOptions = useMemo(() => {
    const list = assignees.map((a) => ({ value: a.id.toString(), label: a.fullName }))
    if (detail?.defaultAssigneeId && !list.some((o) => o.value === detail.defaultAssigneeId!.toString())) {
      list.unshift({ value: detail.defaultAssigneeId.toString(), label: detail.defaultAssigneeName ?? `#${detail.defaultAssigneeId}` })
    }
    return list
  }, [assignees, detail])

  useEffect(() => {
    if (!open) return
    reset(editing && detail ? categoryToForm(detail) : emptyCategory())
  }, [open, editing, detail, reset])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id: categoryId, body: categoryToRequest(values, detail?.version) })
      enqueueSnackbar(editing ? 'Đã cập nhật danh mục.' : 'Đã thêm danh mục.', { variant: 'success' })
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
      title={editing ? 'Chỉnh sửa danh mục yêu cầu' : 'Thêm danh mục yêu cầu'}
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
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Box sx={{ gridColumn: '1 / -1' }}>
            <FormTextField name="name" control={control} label="Tên danh mục" required placeholder="vd Điện, Nước, Thang máy" />
          </Box>
          <FormTextField
            name="responseSlaHours"
            control={control}
            label="SLA phản hồi"
            required
            helperText="Thời hạn tiếp nhận yêu cầu"
            slotProps={hoursAdornment}
          />
          <FormTextField
            name="resolutionSlaHours"
            control={control}
            label="SLA xử lý"
            required
            helperText="Thời hạn hoàn thành yêu cầu"
            slotProps={hoursAdornment}
          />
          <FormSelect
            name="defaultAssigneeId"
            control={control}
            label="Người phụ trách mặc định"
            options={assigneeOptions}
            emptyLabel="Không có"
            helperText="Tự gán nếu người này làm việc ở tòa của yêu cầu"
          />
          <FormSelect name="status" control={control} label="Trạng thái" options={CATEGORY_STATUS_OPTIONS} required />
          <Box sx={{ gridColumn: '1 / -1' }}>
            <FormTextField name="description" control={control} label="Mô tả" multiline minRows={2} />
          </Box>
        </Box>
      )}
    </FormDialog>
  )
}
