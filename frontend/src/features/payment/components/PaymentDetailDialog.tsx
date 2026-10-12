import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { StatusChip } from '@/components/StatusChip'
import { ErrorState } from '@/components/ErrorState'
import { PAYMENT_METHOD_LABEL, RECONCILE_STATUS } from '@/features/feenotice/constants'
import { usePayment } from '@/features/payment/hooks'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { formatPeriod } from '@/lib/period'

interface Props {
  id?: number
  onClose: () => void
}

/** Thông tin phiếu thu (mở từ thông báo / chuông thông báo qua ?view=). */
export function PaymentDetailDialog({ id, onClose }: Props) {
  const { data: p, isLoading, error, refetch } = usePayment(id)
  const row = (label: string, value: ReactNode) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 1, py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {value ?? '—'}
      </Typography>
    </Box>
  )
  return (
    <Dialog open={id != null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 7, fontWeight: 700 }}>
        Phiếu thu {p?.code ?? ''}
        <IconButton aria-label="Đóng" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isLoading || !p ? (
          <Skeleton variant="rounded" height={240} />
        ) : (
          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <StatusChip label={p.status === 'VALID' ? 'Hợp lệ' : 'Đã huỷ'} tone={p.status === 'VALID' ? 'success' : 'neutral'} />
              <StatusChip {...RECONCILE_STATUS[p.reconcileStatus]} />
            </Stack>
            {row('Số tiền', <b>{formatCurrency(p.amount)}</b>)}
            {row(
              'Thông báo phí',
              <Link component={RouterLink} to={`/fee-notices/${p.feeNoticeId}`} onClick={onClose}>
                {p.feeNoticeCode}
              </Link>,
            )}
            {row('Kỳ / căn hộ', `${formatPeriod(p.period)} · ${p.apartmentCode}`)}
            {row('Phương thức', PAYMENT_METHOD_LABEL[p.method])}
            {row('Thời gian thu', formatDateTime(p.paidAt))}
            {row('Người thu', p.collectorName)}
            {row('Người nộp', p.payerName)}
            {row('Mã giao dịch NH', p.bankReference)}
            {row('Ghi chú', p.note)}
            {p.status === 'CANCELLED' && row('Huỷ', `${p.cancelReason ?? ''} (${p.cancelledBy ?? ''} · ${formatDateTime(p.cancelledAt)})`)}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}
