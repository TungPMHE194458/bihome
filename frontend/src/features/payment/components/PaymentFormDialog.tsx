import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { FormDialog } from '@/components/FormDialog'
import { FormSelect } from '@/components/form/FormSelect'
import { FormTextField } from '@/components/form/FormTextField'
import { ApartmentPicker } from '@/features/apartment/components/ApartmentPicker'
import type { ApartmentOption } from '@/features/apartment/types'
import { PAYMENT_METHOD_OPTIONS } from '@/features/feenotice/constants'
import { useFeeNotices } from '@/features/feenotice/hooks'
import type { FeeNoticeSummary } from '@/features/feenotice/types'
import { useCreatePayment } from '@/features/payment/hooks'
import { emptyPayment, paymentSchema, paymentToRequest, type PaymentFormValues } from '@/features/payment/schema'
import type { Payment } from '@/features/payment/types'
import { applyFieldErrors, getErrorMessage } from '@/lib/apiError'
import { formatCurrency, formatDate } from '@/lib/format'
import { formatPeriod } from '@/lib/period'

interface Props {
  open: boolean
  /** Đã chọn sẵn thông báo phí (mở từ chi tiết thông báo). */
  notice?: FeeNoticeSummary | null
  onClose: () => void
  onSaved?: (payment: Payment) => void
}

const full = { gridColumn: '1 / -1' } as const

/** Ghi nhận thanh toán thủ công cho một thông báo phí (cho phép trả một phần). */
export function PaymentFormDialog({ open, notice, onClose, onSaved }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const create = useCreatePayment()
  const [apartment, setApartment] = useState<ApartmentOption | null>(null)
  const { control, handleSubmit, reset, setValue, setError, formState } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: emptyPayment(),
  })
  const [feeNoticeId, method, outstanding] = useWatch({ control, name: ['feeNoticeId', 'method', 'outstanding'] })
  const { data: unpaid, isFetching, error: unpaidError } = useFeeNotices(
    { apartmentId: apartment?.id ?? 0, unpaid: 'true', size: 50, sort: 'period,asc' },
    open && !notice && apartment != null,
  )

  useEffect(() => {
    if (!open) return
    setApartment(null)
    reset(emptyPayment(notice?.id ?? null, notice?.outstanding ?? 0))
  }, [open, notice, reset])

  const choose = (n: FeeNoticeSummary | undefined) => {
    setValue('feeNoticeId', n?.id ?? null, { shouldValidate: formState.isSubmitted })
    setValue('outstanding', n?.outstanding ?? 0)
    setValue('amount', n ? String(n.outstanding) : '')
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await create.mutateAsync(paymentToRequest(values))
      enqueueSnackbar(`Đã ghi nhận phiếu thu ${saved.code} – ${formatCurrency(saved.amount)}.`, { variant: 'success' })
      onSaved?.(saved)
      onClose()
    } catch (e) {
      if (!applyFieldErrors(e, setError, ['amount', 'paidAt', 'feeNoticeId', 'bankReference'])) {
        enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      }
    }
  })

  const notices = unpaid?.content ?? []
  const selected = notice ?? notices.find((n) => n.id === feeNoticeId)

  return (
    <FormDialog
      open={open}
      title="Ghi nhận thanh toán"
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={formState.isSubmitting}
      dirty={formState.isDirty}
      submitLabel="Ghi nhận"
    >
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        {notice ? (
          <Alert severity="info" sx={full}>
            Thông báo <b>{notice.code}</b> · căn {notice.apartmentCode} · kỳ {formatPeriod(notice.period)} · còn nợ{' '}
            <b>{formatCurrency(notice.outstanding)}</b>
          </Alert>
        ) : (
          <>
            <Box sx={full}>
              <ApartmentPicker
                value={apartment}
                onChange={(a) => {
                  setApartment(a)
                  choose(undefined)
                }}
              />
            </Box>
            <Controller
              name="feeNoticeId"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  select
                  label="Thông báo phí còn nợ"
                  required
                  value={field.value ?? ''}
                  disabled={!apartment}
                  error={!!fieldState.error}
                  helperText={
                    fieldState.error?.message ??
                    (unpaidError
                      ? getErrorMessage(unpaidError)
                      : apartment && !isFetching && notices.length === 0
                        ? 'Căn này không còn thông báo phí nào cần thu'
                        : undefined)
                  }
                  onChange={(e) => choose(notices.find((n) => n.id === Number(e.target.value)))}
                  sx={full}
                >
                  {notices.map((n) => (
                    <MenuItem key={n.id} value={n.id}>
                      {n.code} · kỳ {formatPeriod(n.period)} · còn {formatCurrency(n.outstanding)} · hạn {formatDate(n.dueDate)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </>
        )}
        <FormTextField
          name="amount"
          control={control}
          label="Số tiền (đ)"
          required
          helperText={selected ? `Còn nợ ${formatCurrency(outstanding)}` : undefined}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
        <FormSelect name="method" control={control} label="Phương thức" options={PAYMENT_METHOD_OPTIONS} required />
        <FormTextField
          name="paidAt"
          control={control}
          label="Thời gian thu"
          type="datetime-local"
          required
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FormTextField name="payerName" control={control} label="Người nộp" placeholder={selected?.holderName ?? ''} />
        {method !== 'CASH' && (
          <FormTextField name="bankReference" control={control} label="Mã giao dịch ngân hàng" sx={full} />
        )}
        <FormTextField name="note" control={control} label="Ghi chú" multiline minRows={2} sx={full} />
        {method !== 'CASH' && (
          <Typography variant="caption" color="text.secondary" sx={full}>
            Phiếu chuyển khoản / VietQR nhập tay ở trạng thái “Chờ khớp” cho đến khi đối soát với sao kê.
          </Typography>
        )}
      </Box>
    </FormDialog>
  )
}
