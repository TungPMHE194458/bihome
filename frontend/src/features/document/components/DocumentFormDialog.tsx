import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormFileUpload } from '@/components/form/FormFileUpload'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { TagInput } from '@/features/document/components/TagInput'
import { AUDIENCE_OPTIONS } from '@/features/document/constants'
import { useDocument, useDocumentCategoryOptions, useSaveDocument } from '@/features/document/hooks'
import {
  documentSchema,
  documentToForm,
  documentToRequest,
  emptyDocument,
  nameFromFile,
  type DocumentFormValues,
} from '@/features/document/schema'
import { useBuildingOptions } from '@/features/building/hooks'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { useBuildingStore } from '@/stores/buildingStore'

interface Props {
  open: boolean
  documentId?: number
  onClose: () => void
}

const full = { gridColumn: '1 / -1' } as const

/** Thêm tài liệu (kèm tệp) vào tòa đang chọn hoặc sửa thông tin; thay tệp ở dialog riêng. */
export function DocumentFormDialog({ open, documentId, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = documentId != null
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const building = useBuildingOptions().data?.find((b) => b.id === buildingId)
  const { data: detail, isLoading, error: loadError, refetch } = useDocument(open ? documentId : undefined)
  const { data: categoryOptions = [] } = useDocumentCategoryOptions()
  const save = useSaveDocument()
  const { control, handleSubmit, reset, setError, setValue, getValues, formState } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: emptyDocument(),
  })
  const file = useWatch({ control, name: 'file' })

  // Danh mục hiện tại có thể đã ngừng hoạt động: vẫn hiện để giữ nguyên khi sửa.
  const categories = useMemo(() => {
    const list = categoryOptions.map((c) => ({ value: c.id.toString(), label: c.name }))
    if (detail && !list.some((c) => c.value === detail.categoryId.toString())) {
      list.unshift({ value: detail.categoryId.toString(), label: `${detail.categoryName} (ngừng hoạt động)` })
    }
    return list
  }, [categoryOptions, detail])

  useEffect(() => {
    if (!open) return
    reset(editing && detail ? documentToForm(detail) : emptyDocument())
  }, [open, editing, detail, reset])

  // Chọn tệp khi chưa nhập tên → gợi ý tên từ tên tệp.
  useEffect(() => {
    if (file && !getValues('name').trim()) setValue('name', nameFromFile(file), { shouldDirty: true })
  }, [file, getValues, setValue])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({ id: documentId, body: documentToRequest(values, detail?.version) })
      enqueueSnackbar(editing ? 'Đã cập nhật tài liệu.' : `Đã thêm tài liệu mã ${saved.code}.`, { variant: 'success' })
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, undefined, { fileId: 'file' })) {
        enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      }
    }
  })

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? 'Chỉnh sửa tài liệu' : 'Thêm tài liệu'}
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
        <Alert severity="warning">Vui lòng chọn một tòa nhà ở thanh trên cùng trước khi thêm tài liệu.</Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {!editing && (
            <Box sx={full}>
              <FormFileUpload name="file" control={control} purpose="DOCUMENT" label="Tệp tài liệu *" />
            </Box>
          )}
          <FormTextField name="name" control={control} label="Tên tài liệu" required />
          <FormTextField
            name="code"
            control={control}
            label="Mã"
            transform={(v) => v.toUpperCase()}
            helperText={editing ? undefined : 'Bỏ trống để tự sinh số'}
          />
          <FormSelect name="categoryId" control={control} label="Danh mục" options={categories} required />
          <FormSelect name="audience" control={control} label="Đối tượng" options={AUDIENCE_OPTIONS} required />
          <Box sx={full}>
            <Controller
              name="tags"
              control={control}
              render={({ field, fieldState }) => (
                <TagInput value={field.value} onChange={field.onChange} error={fieldState.error?.message} inputRef={field.ref} />
              )}
            />
          </Box>
          <Box sx={full}>
            <FormTextField name="description" control={control} label="Mô tả" multiline minRows={2} />
          </Box>
          {!editing && building && (
            <Alert severity="info" sx={full}>
              Tài liệu được thêm vào tòa nhà <b>{building.name}</b>.
            </Alert>
          )}
        </Box>
      )}
    </FormDialog>
  )
}
