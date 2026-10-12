import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import InputAdornment from '@mui/material/InputAdornment'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { FormDialog } from '@/components/FormDialog'
import { FormTextField } from '@/components/form/FormTextField'
import type { ApartmentOption } from '@/features/apartment/types'
import { ApartmentPicker } from '@/features/apartment/components/ApartmentPicker'
import { ResidentPicker, type ResidentOption } from '@/features/resident/components/ResidentPicker'
import { serviceApi } from '@/features/servicecatalog/api'
import { useServiceOptions } from '@/features/servicecatalog/hooks'
import type { ServiceOrderRequest } from '@/features/servicecatalog/types'
import { applyFieldErrors, getErrorMessage, getProblem } from '@/lib/apiError'
import dayjs, { APP_TIMEZONE } from '@/lib/dayjs'
import { formatCurrency } from '@/lib/format'
import { useBuildingStore } from '@/stores/buildingStore'

const schema = z
  .object({
    serviceId: z.number().nullable(),
    apartment: z.custom<ApartmentOption>().nullable(),
    resident: z.custom<ResidentOption>().nullable(),
    quantity: z.string().trim().regex(/^\d{1,5}([.,]\d{1,2})?$/, 'Số lượng tối đa 2 chữ số thập phân'),
    scheduledAt: z.string(),
    voucherCode: z.string().trim().max(30, 'Mã voucher tối đa 30 ký tự'),
    note: z.string().trim().max(500, 'Ghi chú tối đa 500 ký tự'),
  })
  .superRefine((v, ctx) => {
    if (v.serviceId == null) ctx.addIssue({ code: 'custom', path: ['serviceId'], message: 'Vui lòng chọn dịch vụ' })
    if (v.apartment == null) ctx.addIssue({ code: 'custom', path: ['apartment'], message: 'Vui lòng chọn căn hộ' })
    if (Number(v.quantity.replace(',', '.')) <= 0) ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Số lượng phải lớn hơn 0' })
  })
type Values = z.infer<typeof schema>

const empty = (): Values => ({ serviceId: null, apartment: null, resident: null, quantity: '1', scheduledAt: '', voucherCode: '', note: '' })

export const orderToRequest = (v: Values): ServiceOrderRequest => ({
  serviceId: v.serviceId!,
  apartmentId: v.apartment!.id,
  residentId: v.resident?.id ?? null,
  quantity: Number(v.quantity.replace(',', '.')),
  scheduledAt: v.scheduledAt ? dayjs.tz(v.scheduledAt, APP_TIMEZONE).format() : null,
  voucherCode: v.voucherCode.trim() ? v.voucherCode.trim().toUpperCase() : null,
  note: v.note.trim() || null,
})

/** Tạo đơn dịch vụ cho căn hộ: thành tiền = số lượng × đơn giá, có thể dùng voucher. */
export function ServiceOrderFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar()
  const queryClient = useQueryClient()
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data: services = [] } = useServiceOptions(buildingId, open)
  const create = useMutation({
    mutationFn: serviceApi.createOrder,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['services'] })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
  const { control, handleSubmit, reset, setValue, setError, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: empty(),
  })
  const values = useWatch({ control }) as Values
  const service = services.find((s) => s.id === values.serviceId) ?? null

  useEffect(() => {
    if (open) reset(empty())
  }, [open, reset])
  const lastApartment = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (lastApartment.current !== undefined && values.apartment?.id !== lastApartment.current) setValue('resident', null)
    lastApartment.current = values.apartment?.id
  }, [values.apartment, setValue])

  const ready = schema.safeParse(values).success
  const request = ready ? orderToRequest(values) : null
  const [debounced, setDebounced] = useState(request)
  const key = JSON.stringify(request)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(request), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const quote = useQuery({
    queryKey: ['services', 'order-quote', JSON.stringify(debounced)],
    enabled: open && debounced != null,
    queryFn: () => serviceApi.quoteOrder(debounced!),
    retry: false,
  })
  const voucherError = getProblem(quote.error)?.errors?.find((e) => e.field === 'voucherCode')?.message

  const onSubmit = handleSubmit(async (v) => {
    try {
      const saved = await create.mutateAsync(orderToRequest(v))
      enqueueSnackbar(`Đã tạo đơn ${saved.code} — ${formatCurrency(saved.total)}.`, { variant: 'success' })
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, Object.keys(empty()), { apartmentId: 'apartment', residentId: 'resident' })) {
        enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      }
    }
  })

  return (
    <FormDialog
      open={open}
      title="Tạo đơn dịch vụ"
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
      submitLabel="Tạo đơn"
      maxWidth="sm"
    >
      {buildingId == null ? (
        <Alert severity="warning">Vui lòng chọn một tòa nhà ở thanh trên cùng trước khi tạo đơn dịch vụ.</Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Controller
            name="serviceId"
            control={control}
            render={({ field, fieldState }) => (
              <Autocomplete
                value={service}
                options={services}
                getOptionLabel={(o) => `${o.name} · ${formatCurrency(o.unitPrice)} / ${o.unit}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                onChange={(_, v) => field.onChange(v?.id ?? null)}
                noOptionsText="Tòa chưa có dịch vụ đang hoạt động"
                renderInput={(p) => <TextField {...p} label="Dịch vụ" required inputRef={field.ref} error={!!fieldState.error} helperText={fieldState.error?.message} />}
              />
            )}
          />
          <Controller
            name="apartment"
            control={control}
            render={({ field, fieldState }) => (
              <ApartmentPicker value={field.value} onChange={field.onChange} buildingId={buildingId} error={fieldState.error?.message} inputRef={field.ref} />
            )}
          />
          <Controller
            name="resident"
            control={control}
            render={({ field, fieldState }) => (
              <ResidentPicker
                value={field.value}
                onChange={field.onChange}
                apartmentId={values.apartment?.id}
                label="Cư dân yêu cầu (không bắt buộc)"
                error={fieldState.error?.message}
                inputRef={field.ref}
              />
            )}
          />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <FormTextField
              name="quantity"
              control={control}
              label="Số lượng"
              required
              transform={(v) => v.replace(/[^\d.,]/g, '')}
              slotProps={{ input: { endAdornment: service ? <InputAdornment position="end">{service.unit}</InputAdornment> : undefined } }}
            />
            <FormTextField name="scheduledAt" control={control} label="Hẹn thực hiện lúc" type="datetime-local" slotProps={{ inputLabel: { shrink: true } }} />
          </Box>
          <Controller
            name="voucherCode"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                label="Mã voucher"
                error={!!fieldState.error || !!voucherError}
                helperText={fieldState.error?.message ?? voucherError ?? 'Không bắt buộc'}
              />
            )}
          />
          <FormTextField name="note" control={control} label="Ghi chú" multiline minRows={2} />
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }} aria-label="Chi phí">
            {quote.data ? (
              <Stack spacing={0.5}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">
                    {values.quantity} {quote.data.unit} × {formatCurrency(quote.data.unitPrice)}
                  </Typography>
                  <Typography variant="body2">{formatCurrency(quote.data.amount)}</Typography>
                </Stack>
                {quote.data.discount > 0 && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2">Voucher {quote.data.voucherCode}</Typography>
                    <Typography variant="body2">−{formatCurrency(quote.data.discount)}</Typography>
                  </Stack>
                )}
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" fontWeight={700}>
                    Thành tiền
                  </Typography>
                  <Typography variant="body2" fontWeight={800}>
                    {formatCurrency(quote.data.total)}
                  </Typography>
                </Stack>
              </Stack>
            ) : (
              <Typography variant="body2" color={quote.error && !voucherError ? 'error.main' : 'text.secondary'}>
                {quote.error && !voucherError ? getErrorMessage(quote.error) : 'Chọn dịch vụ, căn hộ và số lượng để xem thành tiền.'}
              </Typography>
            )}
          </Paper>
        </Box>
      )}
    </FormDialog>
  )
}
