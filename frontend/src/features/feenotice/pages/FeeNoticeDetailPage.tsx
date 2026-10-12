import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined'
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { AuthImage } from '@/components/AuthImage'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'
import { PdfPreviewDialog } from '@/components/PdfPreviewDialog'
import { ReasonDialog } from '@/components/ReasonDialog'
import { StatusChip } from '@/components/StatusChip'
import { feeNoticeApi } from '@/features/feenotice/api'
import { FeeItemsTable } from '@/features/feenotice/components/FeeItemsTable'
import { FeeNoticeEditDialog } from '@/features/feenotice/components/FeeNoticeEditDialog'
import { FEE_NOTICE_STATUS, PAYMENT_METHOD_LABEL, RECONCILE_STATUS, isCollectible } from '@/features/feenotice/constants'
import { useFeeNotice, useFeeNoticeAction, useVietQr } from '@/features/feenotice/hooks'
import type { FeeNoticeDetail } from '@/features/feenotice/types'
import { PaymentFormDialog } from '@/features/payment/components/PaymentFormDialog'
import { getErrorMessage } from '@/lib/apiError'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { formatPeriod } from '@/lib/period'
import { usePermission } from '@/stores/authStore'

type Pending = 'issue' | 'recalculate' | 'delete'
const CONFIRM: Record<Pending, { title: string; message: string; label: string; done: string }> = {
  issue: {
    title: 'Phát hành thông báo phí?',
    message: 'Sau khi phát hành không sửa được khoản, số liệu điện nước của kỳ bị khoá và cư dân nhận được thông báo.',
    label: 'Phát hành',
    done: 'Đã phát hành thông báo phí.',
  },
  recalculate: {
    title: 'Tính lại theo số liệu hiện tại?',
    message: 'Các khoản được tính lại theo đơn giá, số liệu điện nước và khoản chưa thu mới nhất; dòng giảm trừ được giữ.',
    label: 'Tính lại',
    done: 'Đã tính lại thông báo phí.',
  },
  delete: { title: 'Xoá thông báo nháp?', message: 'Khoản tiện ích / dịch vụ trong thông báo sẽ vào kỳ sau.', label: 'Xoá', done: 'Đã xoá thông báo phí.' },
}

/** Chi tiết thông báo phí: các khoản, phiếu thu, mã VietQR; phát hành / sửa / huỷ / thu tiền. */
export function FeeNoticeDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const { data: n, isLoading, error, refetch } = useFeeNotice(id)
  const action = useFeeNoticeAction()
  const canWrite = usePermission('FEE_NOTICE_WRITE')
  const canDelete = usePermission('FEE_NOTICE_DELETE')
  const canPay = usePermission('PAYMENT_WRITE')
  const [editing, setEditing] = useState(false)
  const [paying, setPaying] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [pdf, setPdf] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />
  if (isLoading || !n) return <Skeleton variant="rounded" height={420} />
  const s = n.summary
  const draft = s.status === 'DRAFT'
  const collectible = isCollectible(s)

  const run = async () => {
    if (!pending) return
    try {
      await action.mutateAsync(pending === 'delete' ? { type: 'delete', id } : { type: pending, id, version: s.version })
      enqueueSnackbar(CONFIRM[pending].done, { variant: 'success' })
      setPending(null)
      if (pending === 'delete') navigate('/fee-notices')
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  return (
    <Stack spacing={2}>
      <PageBreadcrumb title={s.code} parents={[{ label: 'Thông báo phí', to: '/fee-notices' }]} />
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" fontWeight={800}>
                Thông báo phí {s.code}
              </Typography>
              <StatusChip {...FEE_NOTICE_STATUS[s.status]} />
              {s.carriedToId && <StatusChip label={`Đã chuyển nợ sang ${s.carriedToCode ?? ''}`} tone="warning" />}
            </Stack>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Căn <b>{s.apartmentCode}</b> (tầng {n.floorNo}) · Chủ hộ <b>{s.holderName ?? '—'}</b> · Kỳ {formatPeriod(s.period)} · Hạn
              thanh toán <b>{formatDate(s.dueDate)}</b>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {s.buildingName} · {n.buildingAddress}
              {s.issuedAt ? ` · Phát hành ${formatDateTime(s.issuedAt)} bởi ${n.issuedBy ?? ''}` : ''}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="flex-start">
            {canPay && collectible && (
              <Button variant="contained" startIcon={<PaymentsOutlinedIcon />} onClick={() => setPaying(true)}>
                Ghi nhận thanh toán
              </Button>
            )}
            {canWrite && draft && (
              <>
                <Button variant="contained" startIcon={<PublishOutlinedIcon />} onClick={() => setPending('issue')}>
                  Phát hành
                </Button>
                <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setEditing(true)}>
                  Sửa khoản
                </Button>
                <Button startIcon={<CalculateOutlinedIcon />} onClick={() => setPending('recalculate')}>
                  Tính lại
                </Button>
              </>
            )}
            <Button startIcon={<PictureAsPdfOutlinedIcon />} onClick={() => setPdf(true)}>
              Xem PDF
            </Button>
            {canWrite && collectible && s.paidAmount === 0 && (
              <Button color="warning" startIcon={<CancelOutlinedIcon />} onClick={() => setCancelling(true)}>
                Huỷ
              </Button>
            )}
            {canDelete && draft && (
              <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={() => setPending('delete')}>
                Xoá
              </Button>
            )}
          </Stack>
        </Stack>
        {s.status === 'CANCELLED' && n.cancelReason && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Đã huỷ: {n.cancelReason}
          </Alert>
        )}
        {n.carriedFrom.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Gồm nợ chuyển từ:{' '}
            {n.carriedFrom.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ', '}
                <Link component={RouterLink} to={`/fee-notices/${c.id}`}>
                  {c.code}
                </Link>{' '}
                (kỳ {formatPeriod(c.period)})
              </span>
            ))}
          </Typography>
        )}
      </Paper>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, alignItems: 'start' }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 0, overflowX: 'auto' }}>
          <Typography fontWeight={700} sx={{ mb: 1 }}>
            Các khoản
          </Typography>
          <FeeItemsTable items={n.items} total={s.totalAmount} paid={draft ? undefined : s.paidAmount}
            outstanding={draft || s.status === 'CANCELLED' ? undefined : s.outstanding} />
          {n.note && (
            <Typography variant="body2" sx={{ mt: 1.5 }}>
              Ghi chú: {n.note}
            </Typography>
          )}
        </Paper>
        <Stack spacing={2}>
          <VietQrPanel notice={n} />
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography fontWeight={700} sx={{ mb: 1 }}>
              Phiếu thu ({n.payments.length})
            </Typography>
            {n.payments.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Chưa có phiếu thu.
              </Typography>
            ) : (
              <Table size="small" aria-label="Phiếu thu của thông báo">
                <TableHead>
                  <TableRow>
                    <TableCell>Mã phiếu</TableCell>
                    <TableCell align="right">Số tiền</TableCell>
                    <TableCell>Đối soát</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {n.payments.map((p) => (
                    <TableRow key={p.id} sx={{ opacity: p.status === 'CANCELLED' ? 0.55 : 1 }}>
                      <TableCell>
                        <Link component={RouterLink} to={`/payments?view=${p.id}`}>
                          {p.code}
                        </Link>
                        <Typography variant="caption" color="text.secondary" component="div">
                          {PAYMENT_METHOD_LABEL[p.method]} · {formatDateTime(p.paidAt)}
                          {p.status === 'CANCELLED' ? ' · Đã huỷ' : ''}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ textDecoration: p.status === 'CANCELLED' ? 'line-through' : undefined }}>
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusChip {...RECONCILE_STATUS[p.reconcileStatus]} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Stack>
      </Box>

      <FeeNoticeEditDialog notice={editing ? n : null} onClose={() => setEditing(false)} />
      <PaymentFormDialog open={paying} notice={s} onClose={() => setPaying(false)} />
      <PdfPreviewDialog
        path={pdf ? feeNoticeApi.pdfPath(id) : null}
        title={`Thông báo phí ${s.code}`}
        fileName={`thong-bao-phi-${s.code.toLowerCase()}.pdf`}
        onClose={() => setPdf(false)}
      />
      <ConfirmDialog
        open={!!pending}
        title={pending ? CONFIRM[pending].title : ''}
        message={pending ? CONFIRM[pending].message : ''}
        confirmLabel={pending ? CONFIRM[pending].label : undefined}
        variant={pending === 'delete' ? 'danger' : undefined}
        loading={action.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => void run()}
      />
      <ReasonDialog
        open={cancelling}
        title={`Huỷ thông báo phí ${s.code}?`}
        message="Khoản tiện ích / dịch vụ và nợ kỳ trước (nếu có) được trả về để tính ở thông báo khác."
        label="Lý do huỷ"
        confirmLabel="Huỷ thông báo"
        danger
        loading={action.isPending}
        onClose={() => setCancelling(false)}
        onConfirm={async (reason) => {
          try {
            await action.mutateAsync({ type: 'cancel', id, version: s.version, reason })
            enqueueSnackbar('Đã huỷ thông báo phí.', { variant: 'success' })
            setCancelling(false)
          } catch (e) {
            enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
          }
        }}
      />
    </Stack>
  )
}

function VietQrPanel({ notice: n }: { notice: FeeNoticeDetail }) {
  const s = n.summary
  const { data: qr, error } = useVietQr(s.id, n.vietQrAvailable, s.version)
  if (!n.vietQrAvailable) {
    if (s.outstanding <= 0 || s.status === 'DRAFT' || s.status === 'CANCELLED') return null
    return (
      <Alert severity="info" variant="outlined">
        Tòa chưa bật VietQR. Nội dung chuyển khoản: <b>{n.transferContent ?? `BIHOME ${s.code}`}</b>
      </Alert>
    )
  }
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }} aria-label="Mã VietQR">
      <Typography fontWeight={700} sx={{ mb: 1 }}>
        Thanh toán VietQR
      </Typography>
      {error ? (
        <Typography variant="body2" color="error">
          {getErrorMessage(error)}
        </Typography>
      ) : (
        <Stack direction="row" spacing={2} alignItems="center">
          <AuthImage url={`${feeNoticeApi.qrImagePath(s.id)}?v=${s.version}`} alt={`Mã VietQR ${s.code}`}
            sx={{ width: 150, height: 150, borderRadius: 1, flexShrink: 0 }} />
          {qr && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2">
                STK <b>{qr.accountNo}</b> (BIN {qr.bankBin})
              </Typography>
              <Typography variant="body2">{qr.accountName}</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Số tiền <b>{formatCurrency(qr.amount)}</b>
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                Nội dung <b>{qr.content}</b>
              </Typography>
            </Box>
          )}
        </Stack>
      )}
    </Paper>
  )
}
