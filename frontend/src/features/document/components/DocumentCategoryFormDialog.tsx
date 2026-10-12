import CheckIcon from '@mui/icons-material/Check'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { StatusChip } from '@/components/StatusChip'
import { CATEGORY_COLORS, CATEGORY_STATUS_OPTIONS } from '@/features/document/constants'
import { useDocumentCategory, useSaveDocumentCategory } from '@/features/document/hooks'
import {
  categorySchema,
  categoryToForm,
  categoryToRequest,
  emptyCategory,
  type CategoryFormValues,
} from '@/features/document/schema'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'

interface Props {
  open: boolean
  categoryId?: number
  onClose: () => void
}

export function DocumentCategoryFormDialog({ open, categoryId, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = categoryId != null
  const { data: detail, isLoading, error: loadError, refetch } = useDocumentCategory(open ? categoryId : undefined)
  const save = useSaveDocumentCategory()
  const { control, handleSubmit, reset, setError, setValue, formState } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: emptyCategory(),
  })
  const [name, color] = useWatch({ control, name: ['name', 'color'] })
  const validColor = /^#[0-9A-Fa-f]{6}$/.test(color)

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
      title={editing ? 'Chỉnh sửa danh mục tài liệu' : 'Thêm danh mục tài liệu'}
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
          <FormTextField name="name" control={control} label="Tên danh mục" required placeholder="vd Nội quy, Biểu mẫu" />
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Màu chip
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              {CATEGORY_COLORS.map((c) => (
                <ButtonBase
                  key={c}
                  aria-label={`Chọn màu ${c}`}
                  onClick={() => setValue('color', c, { shouldDirty: true, shouldValidate: true })}
                  sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: c, color: '#fff' }}
                >
                  {color.toUpperCase() === c && <CheckIcon fontSize="small" />}
                </ButtonBase>
              ))}
              <Box sx={{ width: 120 }}>
                <FormTextField name="color" control={control} label="Mã màu" size="small" transform={(v) => v.toUpperCase()} />
              </Box>
              <StatusChip label={name.trim() || 'Xem trước'} color={validColor ? color : undefined} />
            </Stack>
          </Box>
          <FormSelect name="status" control={control} label="Trạng thái" options={CATEGORY_STATUS_OPTIONS} required />
          <FormTextField name="description" control={control} label="Mô tả" multiline minRows={2} />
        </Box>
      )}
    </FormDialog>
  )
}
