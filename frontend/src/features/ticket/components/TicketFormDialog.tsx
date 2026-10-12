import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo, useRef } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { AttachmentList } from '@/components/form/AttachmentList'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { ApartmentPicker } from '@/features/apartment/components/ApartmentPicker'
import { ResidentPicker } from '@/features/resident/components/ResidentPicker'
import { CHANNEL_OPTIONS, PRIORITY_OPTIONS, formatHours } from '@/features/ticket/constants'
import { useAssignees, useSaveTicket, useTicket, useTicketCategoryOptions } from '@/features/ticket/hooks'
import { emptyTicket, ticketSchema, ticketToForm, ticketToRequest, type TicketFormValues } from '@/features/ticket/schema'
import type { TicketDetail } from '@/features/ticket/types'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { useBuildingStore } from '@/stores/buildingStore'

interface Props {
  open: boolean
  ticketId?: number
  onClose: () => void
  onCreated?: (ticket: TicketDetail) => void
}

const full = { gridColumn: '1 / -1' } as const

/** Thêm yêu cầu (vào tòa đang chọn / tòa của căn hộ) hoặc sửa thông tin; phân công và trạng thái đổi ở chi tiết. */
export function TicketFormDialog({ open, ticketId, onClose, onCreated }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const editing = ticketId != null
  const selectedBuildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data: detail, isLoading, error: loadError, refetch } = useTicket(open ? ticketId : undefined)
  const { data: categories = [] } = useTicketCategoryOptions()
  const save = useSaveTicket()
  const { control, handleSubmit, reset, setError, setValue, formState } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: emptyTicket(),
  })
  const [apartment, categoryId] = useWatch({ control, name: ['apartment', 'categoryId'] })
  const buildingId = editing ? detail?.ticket.buildingId : (apartment?.buildingId ?? selectedBuildingId)
  const { data: assignees = [] } = useAssignees(buildingId, open && !editing)
  const category = categories.find((c) => c.id.toString() === categoryId)

  const categoryOptions = useMemo(() => {
    const list = categories.map((c) => ({ value: c.id.toString(), label: c.name }))
    if (detail && !list.some((c) => c.value === detail.ticket.categoryId.toString())) {
      list.unshift({ value: detail.ticket.categoryId.toString(), label: `${detail.ticket.categoryName} (ngừng hoạt động)` })
    }
    return list
  }, [categories, detail])

  useEffect(() => {
    if (!open) return
    reset(editing && detail ? ticketToForm(detail) : emptyTicket())
  }, [open, editing, detail, reset])

  // Đổi căn hộ thì người gửi cũ có thể không còn ở căn đó.
  const lastApartment = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (lastApartment.current !== undefined && apartment?.id !== lastApartment.current) setValue('resident', null)
    lastApartment.current = apartment?.id
  }, [apartment, setValue])

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({ id: ticketId, body: ticketToRequest(values, detail?.ticket.version) })
      enqueueSnackbar(editing ? 'Đã cập nhật yêu cầu.' : `Đã tạo yêu cầu ${saved.ticket.code}.`, { variant: 'success' })
      onClose()
      if (!editing) onCreated?.(saved)
    } catch (e) {
      const aliases = { apartmentId: 'apartment', residentId: 'resident', fileIds: 'files' }
      if (!applyFieldErrors(e, setError, undefined, aliases)) enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  })

  const noBuilding = !editing && buildingId == null

  return (
    <FormDialog
      open={open}
      loadError={loadError}
      onRetry={() => void refetch()}
      title={editing ? `Chỉnh sửa yêu cầu ${detail?.ticket.code ?? ''}` : 'Tạo yêu cầu hỗ trợ'}
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
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {noBuilding && (
            <Alert severity="info" sx={full}>
              Đang xem tất cả tòa nhà: hãy chọn căn hộ (yêu cầu sẽ thuộc tòa của căn hộ) hoặc chọn một tòa ở thanh trên cùng.
            </Alert>
          )}
          <Box sx={full}>
            <FormTextField name="title" control={control} label="Tiêu đề" required placeholder="vd Mất điện căn A-12.05" />
          </Box>
          <FormSelect
            name="categoryId"
            control={control}
            label="Danh mục"
            options={categoryOptions}
            required
            helperText={category ? `SLA phản hồi ${formatHours(category.responseSlaHours)} · xử lý ${formatHours(category.resolutionSlaHours)}` : undefined}
          />
          <FormSelect name="priority" control={control} label="Mức ưu tiên" options={PRIORITY_OPTIONS} required />
          <Controller
            name="apartment"
            control={control}
            render={({ field, fieldState }) => (
              <ApartmentPicker
                value={field.value}
                onChange={field.onChange}
                buildingId={editing ? detail?.ticket.buildingId : (selectedBuildingId ?? undefined)}
                showBuilding={selectedBuildingId == null}
                label="Căn hộ (không bắt buộc)"
                optional
                error={fieldState.error?.message}
                inputRef={field.ref}
              />
            )}
          />
          <Controller
            name="resident"
            control={control}
            render={({ field, fieldState }) => (
              <ResidentPicker
                value={field.value}
                onChange={field.onChange}
                apartmentId={apartment?.id}
                error={fieldState.error?.message}
                inputRef={field.ref}
              />
            )}
          />
          <FormSelect name="channel" control={control} label="Kênh tiếp nhận" options={CHANNEL_OPTIONS} required />
          {!editing && (
            <FormSelect
              name="assigneeId"
              control={control}
              label="Người xử lý"
              options={assignees.map((a) => ({ value: a.id.toString(), label: a.fullName }))}
              emptyLabel="Theo người phụ trách mặc định của danh mục"
              disabled={buildingId == null}
            />
          )}
          <Box sx={full}>
            <FormTextField name="description" control={control} label="Mô tả" multiline minRows={3} />
          </Box>
          <Box sx={full}>
            <Controller
              name="files"
              control={control}
              render={({ field, fieldState }) => (
                <AttachmentList
                  value={field.value}
                  onChange={field.onChange}
                  purpose="TICKET_ATTACHMENT"
                  label="Đính kèm ảnh / tệp"
                  error={fieldState.error?.message}
                />
              )}
            />
          </Box>
        </Box>
      )}
    </FormDialog>
  )
}
