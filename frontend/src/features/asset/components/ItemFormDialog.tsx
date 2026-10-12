import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo, useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormDatePicker } from '@/components/form/FormDatePicker'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { ApartmentPicker } from '@/features/apartment/components/ApartmentPicker'
import { ASSET_STATUS_OPTIONS } from '@/features/asset/constants'
import { useAssetItem, useCategoryOptions, useSaveItem } from '@/features/asset/hooks'
import { emptyItem, itemSchema, itemToForm, itemToRequest, normalizePlate, willBeInactive, type ItemFormValues } from '@/features/asset/schema'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { useBuildingStore } from '@/stores/buildingStore'

interface ItemFormDialogProps {
  open: boolean
  itemId?: number
  onClose: () => void
}

const full = { gridColumn: '1 / -1' } as const

export function ItemFormDialog({ open, itemId, onClose }: ItemFormDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = itemId != null
  const showBuilding = useBuildingStore((s) => s.selectedBuildingId == null)
  const { data: detail, isLoading, error: loadError, refetch } = useAssetItem(open ? itemId : undefined)
  const save = useSaveItem()
  const { control, handleSubmit, reset, setError, setValue, getValues, formState } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: emptyItem(),
  })

  const apartment = useWatch({ control, name: 'apartment' })
  const categoryId = useWatch({ control, name: 'categoryId' })
  const exitDate = useWatch({ control, name: 'exitDate' })
  const { data: categoryOptions = [] } = useCategoryOptions(apartment?.buildingId)

  // Danh mục hiện tại có thể đã ngừng hoạt động: vẫn hiện để giữ nguyên khi sửa.
  const categories = useMemo(() => {
    const list = categoryOptions.map((c) => ({ value: c.id.toString(), label: c.name, unit: c.unit }))
    if (detail && !list.some((c) => c.value === detail.categoryId.toString())) {
      list.unshift({ value: detail.categoryId.toString(), label: `${detail.categoryName} (ngừng hoạt động)`, unit: detail.unit })
    }
    return list
  }, [categoryOptions, detail])

  useEffect(() => {
    if (!open) return
    reset(editing && detail ? itemToForm(detail) : emptyItem())
  }, [open, editing, detail, reset])

  // Đơn vị lấy theo danh mục, trừ khi người dùng đã tự sửa khác đơn vị mặc định.
  const lastDefaultUnit = useRef('')
  useEffect(() => {
    const unit = categories.find((c) => c.value === categoryId)?.unit
    if (!unit) return
    const current = getValues('unit')
    if (!current || current === lastDefaultUnit.current) setValue('unit', unit)
    lastDefaultUnit.current = unit
  }, [categoryId, categories, getValues, setValue])

  // Đổi căn sang tòa khác thì danh mục cũ không còn hợp lệ.
  const lastBuilding = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (lastBuilding.current != null && apartment && apartment.buildingId !== lastBuilding.current) {
      setValue('categoryId', '')
    }
    lastBuilding.current = apartment?.buildingId
  }, [apartment, setValue])

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id: itemId, body: itemToRequest(values, detail?.version) })
      enqueueSnackbar(editing ? 'Đã cập nhật hạng mục.' : 'Đã thêm hạng mục.', { variant: 'success' })
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, undefined, { apartmentId: 'apartment' })) {
        enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      }
    }
  })

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? 'Chỉnh sửa hạng mục' : 'Thêm hạng mục'}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
    >
      {editing && isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Box sx={full}>
            <Controller
              name="apartment"
              control={control}
              render={({ field, fieldState }) => (
                <ApartmentPicker
                  value={field.value}
                  onChange={field.onChange}
                  buildingId={editing ? detail?.buildingId : undefined}
                  showBuilding={showBuilding}
                  error={fieldState.error?.message}
                  inputRef={field.ref}
                />
              )}
            />
          </Box>
          <FormSelect
            name="categoryId"
            control={control}
            label="Danh mục"
            options={categories}
            required
            disabled={!apartment}
            helperText={!apartment ? 'Chọn căn hộ trước' : undefined}
          />
          <FormTextField name="name" control={control} label="Tên hạng mục" required placeholder="vd Honda Vision đỏ" />
          <FormTextField
            name="plateNumber"
            control={control}
            label="Số hiệu / biển số"
            transform={normalizePlate}
            placeholder="vd 30A-123.45"
          />
          <FormTextField name="unit" control={control} label="Đơn vị" helperText="Mặc định theo danh mục" />
          <FormDatePicker name="entryDate" control={control} label="Ngày vào" required />
          <FormDatePicker name="exitDate" control={control} label="Ngày ra" />
          <FormSelect name="status" control={control} label="Trạng thái" options={ASSET_STATUS_OPTIONS} required />
          <Box sx={full}>
            <FormTextField name="description" control={control} label="Mô tả" multiline minRows={2} />
          </Box>
          {willBeInactive(exitDate) && (
            <Alert severity="info" sx={full}>
              Ngày ra không sau hôm nay nên hạng mục sẽ được chuyển sang Ngừng hoạt động khi lưu.
            </Alert>
          )}
        </Box>
      )}
    </FormDialog>
  )
}
