import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { isAxiosError } from 'axios'
import { useSnackbar } from 'notistack'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { METER_TYPE_OPTIONS, METER_UNIT, isSpike } from '@/features/meter/constants'
import { useMeterSheet, useSaveMeterSheet } from '@/features/meter/hooks'
import { parseIndex } from '@/features/meter/schema'
import type { MeterType, SheetEntry } from '@/features/meter/types'
import type { ProblemDetail } from '@/lib/api-types'
import { getErrorMessage } from '@/lib/apiError'
import { formatNumber } from '@/lib/format'
import { formatPeriod, periodOptions } from '@/lib/period'

interface Props {
  open: boolean
  defaultPeriod: string
  onClose: () => void
}

type Draft = { oldIndex: string; newIndex: string }

/** Nhập nhanh chỉ số theo tầng: mỗi căn một dòng, Enter chuyển xuống căn tiếp theo. */
export function MeterSheetDialog({ open, defaultPeriod, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const [period, setPeriod] = useState(defaultPeriod)
  const [meterType, setMeterType] = useState<MeterType>('ELECTRIC')
  const [floor, setFloor] = useState('')
  const { data: sheet, isLoading, error, refetch } = useMeterSheet(period, meterType, floor, open)
  const save = useSaveMeterSheet()
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const unit = METER_UNIT[meterType]

  useEffect(() => {
    if (open) setPeriod(defaultPeriod)
  }, [open, defaultPeriod])

  useEffect(() => {
    if (!sheet) return
    const next: Record<number, Draft> = {}
    sheet.rows.forEach((r) => {
      next[r.apartmentId] = { oldIndex: r.oldIndex == null ? '' : String(r.oldIndex), newIndex: r.newIndex == null ? '' : String(r.newIndex) }
    })
    setDrafts(next)
    setErrors({})
  }, [sheet])

  const changed = useMemo(
    () =>
      (sheet?.rows ?? []).filter((r) => {
        const d = drafts[r.apartmentId]
        if (!d || r.locked || !d.newIndex.trim()) return false
        return parseIndex(d.newIndex) !== r.newIndex || (r.previousPeriod == null && parseIndex(d.oldIndex) !== (r.oldIndex ?? null))
      }),
    [sheet, drafts],
  )

  const submit = async () => {
    if (!sheet) return
    const local: Record<number, string> = {}
    const entries: SheetEntry[] = changed.map((r) => {
      const d = drafts[r.apartmentId]
      const next = parseIndex(d.newIndex)
      const old = r.previousPeriod == null ? (d.oldIndex.trim() ? parseIndex(d.oldIndex) : 0) : (r.oldIndex ?? 0)
      if (next == null) local[r.apartmentId] = 'Chỉ số không hợp lệ'
      else if (old != null && next < old) local[r.apartmentId] = 'Nhỏ hơn chỉ số cũ'
      return { apartmentId: r.apartmentId, newIndex: next, oldIndex: r.previousPeriod == null ? old : null }
    })
    setErrors(local)
    if (Object.keys(local).length > 0) return
    try {
      const res = await save.mutateAsync({ period, meterType, rows: entries })
      enqueueSnackbar(`Đã lưu: thêm ${res.created}, cập nhật ${res.updated}.`, { variant: 'success' })
      void refetch()
    } catch (e) {
      // Lỗi theo dòng: rows[i].newIndex với i là vị trí trong danh sách gửi lên.
      const problem = isAxiosError<ProblemDetail>(e) ? e.response?.data : undefined
      const byRow: Record<number, string> = {}
      problem?.errors?.forEach((fe) => {
        const m = /^rows\[(\d+)]/.exec(fe.field)
        if (m && entries[Number(m[1])]) byRow[entries[Number(m[1])].apartmentId] = fe.message
      })
      setErrors(byRow)
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Nhập chỉ số theo tầng</DialogTitle>
      <DialogContent dividers>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField select label="Kỳ" value={period} onChange={(e) => setPeriod(e.target.value)} sx={{ minWidth: 170 }}>
            {periodOptions(12).map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Loại đồng hồ" value={meterType} onChange={(e) => setMeterType(e.target.value as MeterType)}
            sx={{ minWidth: 150 }}>
            {METER_TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Tầng" value={floor} onChange={(e) => setFloor(e.target.value)} sx={{ minWidth: 130 }}>
            <MenuItem value="">Tất cả</MenuItem>
            {(sheet?.floors ?? []).map((f) => (
              <MenuItem key={f} value={f}>
                Tầng {f}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isLoading || !sheet ? (
          <Skeleton variant="rounded" height={240} />
        ) : sheet.rows.length === 0 ? (
          <Alert severity="info">Không có căn hộ đang hoạt động ở phạm vi đã chọn.</Alert>
        ) : (
          <Table size="small" aria-label={`Chỉ số kỳ ${formatPeriod(period)}`}>
            <TableHead>
              <TableRow>
                <TableCell>Căn hộ</TableCell>
                <TableCell align="right">Chỉ số cũ</TableCell>
                <TableCell align="right" width={170}>
                  Chỉ số mới ({unit})
                </TableCell>
                <TableCell align="right">Tiêu thụ</TableCell>
                <TableCell align="right">TB 3 kỳ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sheet.rows.map((r, i) => {
                const d = drafts[r.apartmentId] ?? { oldIndex: '', newIndex: '' }
                const next = parseIndex(d.newIndex)
                const old = r.previousPeriod == null ? (d.oldIndex.trim() ? parseIndex(d.oldIndex) : 0) : (r.oldIndex ?? 0)
                const consumption = next != null && old != null ? next - old : null
                const spike = isSpike(consumption, r.averageConsumption)
                return (
                  <TableRow key={r.apartmentId} sx={{ opacity: r.locked ? 0.6 : 1 }}>
                    <TableCell>
                      <b>{r.apartmentCode}</b>
                      {r.locked && (
                        <Typography variant="caption" color="text.secondary" component="div">
                          Đã phát hành thông báo phí
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {r.previousPeriod == null && !r.locked ? (
                        <TextField
                          size="small"
                          value={d.oldIndex}
                          placeholder="0"
                          onChange={(e) => setDrafts((x) => ({ ...x, [r.apartmentId]: { ...d, oldIndex: e.target.value } }))}
                          slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': `Chỉ số cũ ${r.apartmentCode}`, style: { textAlign: 'right' } } }}
                          sx={{ width: 110 }}
                        />
                      ) : (
                        formatNumber(r.oldIndex)
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        value={d.newIndex}
                        disabled={r.locked}
                        error={!!errors[r.apartmentId]}
                        helperText={errors[r.apartmentId]}
                        inputRef={(el: HTMLInputElement | null) => {
                          inputs.current[i] = el
                        }}
                        onChange={(e) => setDrafts((x) => ({ ...x, [r.apartmentId]: { ...d, newIndex: e.target.value } }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            inputs.current.slice(i + 1).find((el) => el && !el.disabled)?.focus()
                          }
                        }}
                        slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': `Chỉ số mới ${r.apartmentCode}`, style: { textAlign: 'right' } } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      {consumption != null && consumption >= 0 && (
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                          {spike && (
                            <Tooltip title="Tăng hơn 200% so với trung bình 3 kỳ trước">
                              <WarningAmberIcon sx={{ fontSize: 18, color: 'warning.main' }} aria-label="Tăng bất thường" />
                            </Tooltip>
                          )}
                          <span>{formatNumber(consumption)}</span>
                        </Stack>
                      )}
                    </TableCell>
                    <TableCell align="right">{formatNumber(r.averageConsumption)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {changed.length > 0 ? `${changed.length} dòng thay đổi` : 'Dòng để trống sẽ bỏ qua'}
        </Typography>
        <Button onClick={onClose}>Đóng</Button>
        <Button
          variant="contained"
          disabled={changed.length === 0 || save.isPending}
          startIcon={save.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          onClick={() => void submit()}
        >
          Lưu {changed.length > 0 ? changed.length : ''} dòng
        </Button>
      </DialogActions>
    </Dialog>
  )
}
