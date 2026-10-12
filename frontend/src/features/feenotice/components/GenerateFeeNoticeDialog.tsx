import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { Fragment, useEffect, useState } from 'react'
import { StatusChip } from '@/components/StatusChip'
import { FeeItemsTable } from '@/features/feenotice/components/FeeItemsTable'
import { useGenerateFeeNotices, usePreviewFeeNotices } from '@/features/feenotice/hooks'
import type { FeePreview, GenerateRequest } from '@/features/feenotice/types'
import { getErrorMessage } from '@/lib/apiError'
import { formatCurrency, formatDate } from '@/lib/format'
import { formatPeriod, periodOptions } from '@/lib/period'

interface Props {
  open: boolean
  defaultPeriod: string
  onClose: () => void
  onCreated: (period: string) => void
}

/** Tạo thông báo phí hàng loạt cho tòa đang chọn: chọn kỳ → xem trước từng căn → xác nhận tạo nháp. */
export function GenerateFeeNoticeDialog({ open, defaultPeriod, onClose, onCreated }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const preview = usePreviewFeeNotices()
  const generate = useGenerateFeeNotices()
  const [period, setPeriod] = useState(defaultPeriod)
  const [dueDate, setDueDate] = useState('')
  const [floor, setFloor] = useState('')
  const [result, setResult] = useState<FeePreview | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setPeriod(defaultPeriod)
    setDueDate('')
    setFloor('')
    setResult(null)
    setExpanded(null)
  }, [open, defaultPeriod])

  const request = (): GenerateRequest => ({ period, dueDate: dueDate || null, floor: floor.trim() || null })

  const runPreview = async () => {
    try {
      setResult(await preview.mutateAsync(request()))
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const confirm = async () => {
    try {
      const r = await generate.mutateAsync(request())
      enqueueSnackbar(`Đã tạo ${r.created} thông báo phí nháp kỳ ${formatPeriod(r.period)}.`, { variant: 'success' })
      onCreated(r.period)
      onClose()
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Tạo thông báo phí hàng loạt</DialogTitle>
      <DialogContent dividers>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            select
            label="Kỳ"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value)
              setResult(null)
            }}
            sx={{ minWidth: 180 }}
          >
            {periodOptions(12).map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            label="Hạn thanh toán"
            value={dueDate}
            onChange={(e) => {
              setDueDate(e.target.value)
              setResult(null)
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            helperText="Bỏ trống = theo cấu hình đơn giá"
          />
          <TextField
            label="Tầng"
            value={floor}
            onChange={(e) => {
              setFloor(e.target.value)
              setResult(null)
            }}
            helperText="Bỏ trống = cả tòa"
            sx={{ width: 140 }}
          />
          <Button variant="outlined" onClick={() => void runPreview()} disabled={preview.isPending}
            startIcon={preview.isPending ? <CircularProgress size={16} /> : undefined}>
            Xem trước
          </Button>
        </Stack>

        {result && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
              <StatusChip label={`Sẽ tạo ${result.toCreate} thông báo`} tone="primary" />
              {result.skipped > 0 && <StatusChip label={`Bỏ qua ${result.skipped}`} tone="neutral" />}
              {result.withWarnings > 0 && <StatusChip label={`${result.withWarnings} căn có cảnh báo`} tone="warning" />}
              <StatusChip label={`Tổng ${formatCurrency(result.total)}`} tone="info" />
              <StatusChip label={`Hạn ${formatDate(result.dueDate)}`} tone="neutral" />
            </Stack>
            {result.toCreate === 0 && (
              <Alert severity="info" sx={{ mb: 1.5 }}>
                Không có căn nào cần tạo thông báo phí cho kỳ {formatPeriod(result.period)}.
              </Alert>
            )}
            <Table size="small" aria-label="Xem trước thông báo phí">
              <TableHead>
                <TableRow>
                  <TableCell width={40} />
                  <TableCell>Căn hộ</TableCell>
                  <TableCell>Chủ hộ</TableCell>
                  <TableCell align="right">Số khoản</TableCell>
                  <TableCell align="right">Tổng cộng</TableCell>
                  <TableCell>Ghi chú</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.rows.map((r) => {
                  const isOpen = expanded === r.apartmentId
                  return (
                    <Fragment key={r.apartmentId}>
                      <TableRow hover sx={{ opacity: r.skipReason ? 0.6 : 1, cursor: 'pointer' }}
                        onClick={() => setExpanded(isOpen ? null : r.apartmentId)}>
                        <TableCell>
                          <IconButton size="small" aria-label={isOpen ? `Thu gọn ${r.apartmentCode}` : `Xem khoản ${r.apartmentCode}`}>
                            {isOpen ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <b>{r.apartmentCode}</b>
                          <Typography variant="caption" color="text.secondary" component="div">
                            Tầng {r.floorNo}
                          </Typography>
                        </TableCell>
                        <TableCell>{r.holderName ?? '—'}</TableCell>
                        <TableCell align="right">{r.items.length}</TableCell>
                        <TableCell align="right">
                          <b>{formatCurrency(r.total)}</b>
                        </TableCell>
                        <TableCell>
                          {r.skipReason ? (
                            <Typography variant="body2" color="text.secondary">
                              {r.skipReason}
                            </Typography>
                          ) : (
                            r.warnings.map((w) => (
                              <Stack key={w} direction="row" spacing={0.5} alignItems="center">
                                <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                                <Typography variant="body2" color="warning.dark">
                                  {w}
                                </Typography>
                              </Stack>
                            ))
                          )}
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ bgcolor: 'grey.50' }}>
                            <FeeItemsTable items={r.items} total={r.total} dense />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose}>Huỷ</Button>
        <Button
          variant="contained"
          disabled={!result || result.toCreate === 0 || generate.isPending}
          startIcon={generate.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          onClick={() => void confirm()}
        >
          {result ? `Tạo ${result.toCreate} thông báo nháp` : 'Tạo thông báo nháp'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
