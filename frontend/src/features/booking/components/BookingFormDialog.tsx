import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormDatePicker } from '@/components/form/FormDatePicker'
import { FormTextField } from '@/components/form/FormTextField'
import { useAmenityOptions } from '@/features/amenity/hooks'
import { ApartmentPicker } from '@/features/apartment/components/ApartmentPicker'
import { bookingApi } from '@/features/booking/api'
import { SlotPicker } from '@/features/booking/components/SlotPicker'
import { BOOKING_STATUS, formatPrice } from '@/features/booking/constants'
import { useAvailability, useCreateBooking } from '@/features/booking/hooks'
import { bookingSchema, bookingToRequest, canQuote, emptyBooking, type BookingFormValues } from '@/features/booking/schema'
import type { Booking } from '@/features/booking/types'
import { ResidentPicker } from '@/features/resident/components/ResidentPicker'
import { applyFieldErrors, getErrorMessage, getProblem } from '@/lib/apiError'
import dayjs from '@/lib/dayjs'
import { formatCurrency } from '@/lib/format'
import { useBuildingStore } from '@/stores/buildingStore'

interface Props {
  open: boolean
  /** Điền sẵn từ lịch tuần (tiện ích, ngày, khung giờ). */
  preset?: Partial<BookingFormValues>
  onClose: () => void
  onCreated?: (booking: Booking) => void
}

const FIELDS = ['amenityId', 'bookingDate', 'slot', 'apartment', 'resident', 'peopleCount', 'voucherCode', 'note']
const ALIASES = { apartmentId: 'apartment', residentId: 'resident', startTime: 'slot', endTime: 'slot' }

/** Đăng ký tiện ích cho căn hộ: chọn tiện ích → ngày → khung giờ còn chỗ; tính thử phí + voucher khi đủ thông tin. */
export function BookingFormDialog({ open, preset, onClose, onCreated }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const { data: amenities = [], isLoading: loadingAmenities } = useAmenityOptions(buildingId, open)
  const create = useCreateBooking()
  const { control, handleSubmit, reset, setValue, setError, formState } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: emptyBooking(),
  })
  const values = useWatch({ control }) as BookingFormValues
  const { amenityId, bookingDate, slot, apartment } = values
  const { data: availability, isFetching: loadingSlots } = useAvailability(amenityId ?? undefined, bookingDate || undefined)
  const day = availability?.days[0]

  useEffect(() => {
    if (open) reset(emptyBooking({ bookingDate: dayjs().format('YYYY-MM-DD'), ...preset }))
  }, [open, preset, reset])

  // Đổi tiện ích / ngày thì bỏ khung đã chọn nếu không còn hợp lệ; đổi căn thì bỏ cư dân.
  useEffect(() => {
    if (slot && day && !day.slots.some((s) => `${s.startTime}-${s.endTime}` === slot && !s.past && s.remaining > 0)) {
      setValue('slot', '')
    }
  }, [day, slot, setValue])
  const lastApartment = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (lastApartment.current !== undefined && apartment?.id !== lastApartment.current) setValue('resident', null)
    lastApartment.current = apartment?.id
  }, [apartment, setValue])

  // Tính thử phí sau khi người dùng ngừng gõ 400ms.
  const quoteReady = canQuote(values)
  const request = quoteReady ? bookingToRequest(values) : null
  const [debounced, setDebounced] = useState(request)
  const requestKey = JSON.stringify(request)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(request), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey])
  const quote = useQuery({
    queryKey: ['amenity-bookings', 'quote', JSON.stringify(debounced)],
    enabled: open && debounced != null,
    queryFn: () => bookingApi.quote(debounced!),
    retry: false,
  })
  const quoteErrors = getProblem(quote.error)?.errors ?? []
  const voucherError = quoteErrors.find((e) => e.field === 'voucherCode')?.message
  const otherQuoteError = quote.error && !voucherError ? (quoteErrors[0]?.message ?? getErrorMessage(quote.error)) : undefined

  const selectedAmenity = amenities.find((a) => a.id === amenityId) ?? null
  const slotInfo = useMemo(() => day?.slots.find((s) => `${s.startTime}-${s.endTime}` === slot), [day, slot])

  const onSubmit = handleSubmit(async (v) => {
    try {
      const saved = await create.mutateAsync(bookingToRequest(v))
      enqueueSnackbar(`Đã đăng ký ${saved.code} — ${BOOKING_STATUS[saved.status].label.toLowerCase()}.`, { variant: 'success' })
      onCreated?.(saved)
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, FIELDS, ALIASES)) enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  })

  return (
    <FormDialog
      open={open}
      title="Đăng ký tiện ích"
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
      submitLabel="Đăng ký"
      maxWidth="md"
    >
      {buildingId == null ? (
        <Alert severity="warning">Vui lòng chọn một tòa nhà ở thanh trên cùng trước khi đăng ký tiện ích.</Alert>
      ) : (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Controller
            name="amenityId"
            control={control}
            render={({ field, fieldState }) => (
              <Autocomplete
                value={selectedAmenity}
                options={amenities}
                loading={loadingAmenities}
                getOptionLabel={(o) => `${o.name} (${o.code})`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                onChange={(_, v) => field.onChange(v?.id ?? null)}
                noOptionsText="Tòa chưa có tiện ích đang hoạt động"
                renderInput={(p) => (
                  <TextField {...p} label="Tiện ích" required inputRef={field.ref} error={!!fieldState.error} helperText={fieldState.error?.message} />
                )}
              />
            )}
          />
          <FormDatePicker
            name="bookingDate"
            control={control}
            label="Ngày sử dụng"
            required
            disablePast
            maxDate={availability ? dayjs().add(availability.maxAdvanceDays, 'day') : undefined}
          />
          <Box sx={{ gridColumn: '1 / -1' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Khung giờ *
              {availability && (
                <>
                  {' '}
                  · sức chứa {availability.capacity} người
                  {availability.maxBookingsPerWeek ? ` · tối đa ${availability.maxBookingsPerWeek} lượt / căn / tuần` : ''} · huỷ miễn phí
                  trước {availability.freeCancelHours} giờ
                </>
              )}
            </Typography>
            {amenityId == null ? (
              <Typography variant="body2" color="text.disabled">
                Chọn tiện ích và ngày để xem khung giờ còn trống.
              </Typography>
            ) : (
              <Controller
                name="slot"
                control={control}
                render={({ field, fieldState }) => (
                  <SlotPicker day={day} loading={loadingSlots && !day} value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
                )}
              />
            )}
          </Box>
          <Controller
            name="apartment"
            control={control}
            render={({ field, fieldState }) => (
              <ApartmentPicker
                value={field.value}
                onChange={field.onChange}
                buildingId={buildingId}
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
                label="Cư dân đăng ký (không bắt buộc)"
                error={fieldState.error?.message}
                inputRef={field.ref}
              />
            )}
          />
          <FormTextField
            name="peopleCount"
            control={control}
            label="Số người"
            required
            transform={(v) => v.replace(/\D/g, '')}
            helperText={slotInfo ? `Còn ${slotInfo.remaining} chỗ` : undefined}
          />
          <Controller
            name="voucherCode"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                label="Mã voucher"
                fullWidth
                error={!!fieldState.error || !!voucherError}
                helperText={fieldState.error?.message ?? voucherError ?? (quote.data?.voucherCode ? `Áp dụng ${quote.data.voucherCode}` : 'Không bắt buộc')}
              />
            )}
          />
          <Box sx={{ gridColumn: '1 / -1' }}>
            <FormTextField name="note" control={control} label="Ghi chú" multiline minRows={2} />
          </Box>

          <Paper variant="outlined" sx={{ gridColumn: '1 / -1', p: 2, bgcolor: 'grey.50' }} aria-label="Chi phí">
            {!quoteReady ? (
              <Typography variant="body2" color="text.secondary">
                Chọn đủ tiện ích, khung giờ, căn hộ và số người để xem chi phí.
              </Typography>
            ) : quote.isFetching && !quote.data ? (
              <CircularProgress size={20} />
            ) : otherQuoteError ? (
              <Typography variant="body2" color="error.main">
                {otherQuoteError}
              </Typography>
            ) : quote.data ? (
              <Stack spacing={0.5}>
                <Row label={`Phí (${formatPrice(quote.data.unitPrice, quote.data.priceUnit)})`} value={formatCurrency(quote.data.fee)} />
                {quote.data.discount > 0 && <Row label={`Voucher ${quote.data.voucherCode}`} value={`−${formatCurrency(quote.data.discount)}`} />}
                <Divider />
                <Row label="Thành tiền" value={formatCurrency(quote.data.total)} strong />
                <Typography variant="caption" color={quote.data.requiresApproval ? 'warning.dark' : 'success.main'}>
                  {quote.data.requiresApproval ? 'Tiện ích cần Ban quản lý duyệt — đăng ký ở trạng thái Chờ duyệt.' : 'Đăng ký được duyệt ngay.'}
                  {quote.data.total > 0 ? ' Phí ghi vào giao dịch chưa thanh toán.' : ''}
                </Typography>
              </Stack>
            ) : null}
          </Paper>
        </Box>
      )}
    </FormDialog>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" fontWeight={strong ? 700 : 400}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={strong ? 800 : 500} sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Stack>
  )
}
