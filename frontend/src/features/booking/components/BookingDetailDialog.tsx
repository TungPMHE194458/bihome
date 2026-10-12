import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useState, type ReactNode } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { ReasonDialog } from '@/components/ReasonDialog'
import { StatusChip } from '@/components/StatusChip'
import { BOOKING_STATUS, formatPrice } from '@/features/booking/constants'
import { useBooking, useBookingAction } from '@/features/booking/hooks'
import type { Booking } from '@/features/booking/types'
import { PayDialog } from '@/features/transaction/components/PayDialog'
import { PAYMENT_METHOD, TRANSACTION_STATUS } from '@/features/transaction/constants'
import { getErrorMessage } from '@/lib/apiError'
import dayjs from '@/lib/dayjs'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'

/** Chi tiết đăng ký + tác vụ duyệt / từ chối / huỷ / hoàn thành / thu phí. */
export function BookingDetailDialog({ id, onClose }: { id?: number; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar()
  const { data: b, isLoading, error, refetch } = useBooking(id)
  const action = useBookingAction()
  const canWrite = usePermission('AMENITY_BOOKING_WRITE')
  const [reason, setReason] = useState<'reject' | 'cancel' | null>(null)
  const [paying, setPaying] = useState(false)

  const run = async (fn: () => Promise<Booking>, message: string) => {
    try {
      await fn()
      enqueueSnackbar(message, { variant: 'success' })
      return true
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
      return false
    }
  }

  const started = b ? dayjs(`${b.bookingDate}T${b.startTime}`).isBefore(dayjs()) : false
  const lateCancel = b?.status === 'APPROVED' && b.freeCancelUntil ? dayjs().isAfter(dayjs(b.freeCancelUntil)) : false

  return (
    <>
      <Dialog open={id != null} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pr: 6 }}>
          Đăng ký {b?.code ?? ''}
          <IconButton aria-label="Đóng" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : isLoading || !b ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <StatusChip {...BOOKING_STATUS[b.status]} />
                {b.transaction && <StatusChip {...TRANSACTION_STATUS[b.transaction.status]} />}
                <Typography variant="body2" color="text.secondary">
                  {b.buildingName}
                </Typography>
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 0.75, columnGap: 1 }}>
                <Field label="Tiện ích">
                  {b.amenityName} ({b.amenityCode})
                </Field>
                <Field label="Ngày sử dụng">
                  <b>
                    {b.startTime}–{b.endTime}
                  </b>{' '}
                  · {formatDate(b.bookingDate)}
                </Field>
                <Field label="Căn hộ">{b.apartmentCode}</Field>
                <Field label="Cư dân">{b.residentName ?? '—'}</Field>
                <Field label="Số người">{b.peopleCount}</Field>
                {b.note && <Field label="Ghi chú">{b.note}</Field>}
                {b.decidedBy && (
                  <Field label={b.status === 'REJECTED' ? 'Từ chối bởi' : 'Duyệt bởi'}>
                    {b.decidedBy} · {formatDateTime(b.decidedAt)}
                  </Field>
                )}
                {b.rejectReason && <Field label="Lý do từ chối">{b.rejectReason}</Field>}
                {b.cancelReason && (
                  <Field label="Lý do huỷ">
                    {b.cancelReason} · {formatDateTime(b.cancelledAt)}
                  </Field>
                )}
                <Field label="Người tạo">
                  {b.createdBy ?? '—'} · {formatDateTime(b.createdAt)}
                </Field>
              </Box>
              <Divider />
              <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 0.75, columnGap: 1 }}>
                <Field label="Phí">
                  {formatCurrency(b.fee)} <Typography component="span" variant="caption" color="text.secondary">({formatPrice(b.unitPrice, b.priceUnit)})</Typography>
                </Field>
                {b.voucherCode && <Field label={`Voucher ${b.voucherCode}`}>−{formatCurrency(b.discount)}</Field>}
                <Field label="Thành tiền">
                  <b>{formatCurrency(b.total)}</b>
                </Field>
                {b.transaction && (
                  <Field label="Giao dịch">
                    {b.transaction.code} · {TRANSACTION_STATUS[b.transaction.status].label}
                    {b.transaction.method ? ` · ${PAYMENT_METHOD[b.transaction.method]}` : ''}
                    {b.transaction.paidAt ? ` · ${formatDateTime(b.transaction.paidAt)}` : ''}
                  </Field>
                )}
                {b.freeCancelUntil && b.status === 'APPROVED' && (
                  <Field label="Huỷ miễn phí trước">{formatDateTime(b.freeCancelUntil)}</Field>
                )}
              </Box>
            </Stack>
          )}
        </DialogContent>
        {b && canWrite && (
          <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
            {b.transaction?.status === 'PENDING' && b.status !== 'REJECTED' && (
              <Button onClick={() => setPaying(true)} disabled={action.isPending}>
                Ghi nhận thanh toán
              </Button>
            )}
            {b.status.match(/PENDING|APPROVED/) && (
              <Button color="error" onClick={() => setReason('cancel')} disabled={action.isPending}>
                Huỷ đăng ký
              </Button>
            )}
            {b.status === 'PENDING' && (
              <>
                <Button color="warning" onClick={() => setReason('reject')} disabled={action.isPending}>
                  Từ chối
                </Button>
                <Button
                  variant="contained"
                  disabled={action.isPending}
                  onClick={() => void run(() => action.mutateAsync({ type: 'approve', id: b.id, version: b.version }), 'Đã duyệt đăng ký.')}
                >
                  Duyệt
                </Button>
              </>
            )}
            {b.status === 'APPROVED' && started && (
              <Button
                variant="contained"
                disabled={action.isPending}
                onClick={() => void run(() => action.mutateAsync({ type: 'complete', id: b.id, version: b.version }), 'Đã hoàn thành.')}
              >
                Hoàn thành
              </Button>
            )}
          </DialogActions>
        )}
      </Dialog>
      <ReasonDialog
        open={reason != null}
        title={reason === 'reject' ? 'Từ chối đăng ký?' : 'Huỷ đăng ký?'}
        message={
          reason === 'reject'
            ? 'Voucher (nếu có) được trả lại và khoản phí bị huỷ.'
            : lateCancel
              ? 'Đã quá hạn huỷ miễn phí: khoản phí vẫn giữ nguyên.'
              : 'Trước hạn huỷ miễn phí: trả voucher, huỷ khoản chưa thu hoặc hoàn khoản đã thu.'
        }
        label={reason === 'reject' ? 'Lý do từ chối' : 'Lý do huỷ'}
        confirmLabel={reason === 'reject' ? 'Từ chối' : 'Huỷ đăng ký'}
        danger
        loading={action.isPending}
        onClose={() => setReason(null)}
        onConfirm={async (text) => {
          if (!b || !reason) return
          const ok = await run(
            () => action.mutateAsync({ type: reason, id: b.id, version: b.version, reason: text }),
            reason === 'reject' ? 'Đã từ chối đăng ký.' : 'Đã huỷ đăng ký.',
          )
          if (ok) setReason(null)
        }}
      />
      <PayDialog
        open={paying}
        subject={`đăng ký ${b?.code ?? ''}`}
        amount={b?.total ?? 0}
        loading={action.isPending}
        onClose={() => setPaying(false)}
        onConfirm={async (method) => {
          if (!b) return
          const ok = await run(() => action.mutateAsync({ type: 'pay', id: b.id, method }), 'Đã ghi nhận thanh toán.')
          if (ok) setPaying(false)
        }}
      />
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {children}
      </Typography>
    </>
  )
}
