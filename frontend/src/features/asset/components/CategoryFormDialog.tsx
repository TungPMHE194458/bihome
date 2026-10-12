import { zodResolver } from '@hookform/resolvers/zod'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { ASSET_STATUS_OPTIONS, UNIT_SUGGESTIONS } from '@/features/asset/constants'
import { useAssetCategory, useSaveCategory } from '@/features/asset/hooks'
import { categorySchema, categoryToForm, categoryToRequest, emptyCategory, type CategoryFormValues } from '@/features/asset/schema'
import { useBuildingOptions } from '@/features/building/hooks'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { useBuildingStore } from '@/stores/buildingStore'

interface CategoryFormDialogProps {
  open: boolean
  categoryId?: number
  onClose: () => void
}

export function CategoryFormDialog({ open, categoryId, onClose }: CategoryFormDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = categoryId != null
  const selectedBuildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data: detail, isLoading, error: loadError, refetch } = useAssetCategory(open ? categoryId : undefined)
  const { data: buildings = [] } = useBuildingOptions()
  const save = useSaveCategory()
  const { control, handleSubmit, reset, setError, formState } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: emptyCategory(selectedBuildingId),
  })

  const buildingOptions = useMemo(
    () =>
      buildings
        .filter((b) => b.status === 'ACTIVE' || b.id === detail?.buildingId)
        .map((b) => ({ value: b.id.toString(), label: b.name })),
    [buildings, detail?.buildingId],
  )

  useEffect(() => {
    if (!open) return
    reset(editing && detail ? categoryToForm(detail) : emptyCategory(selectedBuildingId))
  }, [open, editing, detail, selectedBuildingId, reset])

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
      title={editing ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'}
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
          <FormSelect
            name="buildingId"
            control={control}
            label="Tòa nhà"
            options={buildingOptions}
            required
            disabled={editing}
          />
          <FormTextField name="name" control={control} label="Tên danh mục" required placeholder="vd Ô tô, Xe máy, Xe đạp" />
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
                renderInput={(params) => (
                  <TextField
                    {...params}
                    inputRef={field.ref}
                    label="Đơn vị"
                    required
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            )}
          />
          <FormSelect name="status" control={control} label="Trạng thái" options={ASSET_STATUS_OPTIONS} required />
          <FormTextField name="description" control={control} label="Mô tả" multiline minRows={2} />
        </Box>
      )}
    </FormDialog>
  )
}
