import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useRef, useState } from 'react'
import { StatusChip } from '@/components/StatusChip'
import { useBuildingOptions } from '@/features/building/hooks'
import type { ImportResult } from '@/lib/api-types'
import { getErrorMessage } from '@/lib/apiError'
import { useBuildingStore } from '@/stores/buildingStore'

export interface ImportExcelDialogProps {
  open: boolean
  onClose: () => void
  /** Tên dữ liệu ở dạng chữ thường, vd "căn hộ", "cư dân". */
  entityLabel: string
  /** Tiêu đề cột khoá của bảng kết quả, vd "Mã căn hộ". */
  keyHeader: string
  onDownloadTemplate: () => Promise<unknown>
  onImport: (file: File, stopOnError: boolean) => Promise<ImportResult>
  pending: boolean
}

/** Nhập dữ liệu từ Excel vào tòa đang chọn ở header; hiện kết quả từng dòng. */
export function ImportExcelDialog({
  open,
  onClose,
  entityLabel,
  keyHeader,
  onDownloadTemplate,
  onImport,
  pending,
}: ImportExcelDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const inputRef = useRef<HTMLInputElement>(null)
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  const building = useBuildingOptions().data?.find((b) => b.id === buildingId)
  const [file, setFile] = useState<File | null>(null)
  const [stopOnError, setStopOnError] = useState(true)
  const [result, setResult] = useState<ImportResult | null>(null)

  const close = () => {
    if (pending) return
    setFile(null)
    setResult(null)
    onClose()
  }

  const submit = async () => {
    if (!file) return
    try {
      setResult(await onImport(file, stopOnError))
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Nhập {entityLabel} từ Excel</DialogTitle>
      <DialogContent dividers>
        {buildingId == null ? (
          <Alert severity="warning">Vui lòng chọn một tòa nhà ở thanh trên cùng trước khi nhập Excel.</Alert>
        ) : (
          <Stack spacing={2}>
            <Typography>
              Dữ liệu {entityLabel} sẽ được nhập vào tòa nhà <b>{building?.name ?? `#${buildingId}`}</b>.
            </Typography>
            <Box>
              <Button
                startIcon={<DownloadOutlinedIcon />}
                onClick={() => onDownloadTemplate().catch((e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }))}
              >
                Tải file mẫu
              </Button>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={() => inputRef.current?.click()}>
                Chọn file .xlsx
              </Button>
              <Typography color={file ? 'text.primary' : 'text.secondary'} noWrap>
                {file?.name ?? 'Chưa chọn file'}
              </Typography>
              <input
                ref={inputRef}
                hidden
                type="file"
                accept=".xlsx"
                aria-label={`File Excel ${entityLabel}`}
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null)
                  setResult(null)
                  e.target.value = ''
                }}
              />
            </Stack>
            <FormControlLabel
              control={<Checkbox checked={stopOnError} onChange={(e) => setStopOnError(e.target.checked)} />}
              label="Dừng khi có lỗi (không nhập dòng nào nếu file còn dòng lỗi)"
            />
            {result && <ImportSummary result={result} entityLabel={entityLabel} keyHeader={keyHeader} />}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button color="inherit" onClick={close} disabled={pending}>
          Đóng
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={!file || buildingId == null || pending}
          startIcon={pending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Nhập dữ liệu
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function ImportSummary({ result, entityLabel, keyHeader }: { result: ImportResult; entityLabel: string; keyHeader: string }) {
  const severity = !result.imported ? 'error' : result.failed > 0 ? 'warning' : 'success'
  const message = !result.imported
    ? `File có ${result.failed}/${result.total} dòng lỗi nên chưa nhập dòng nào. Sửa các dòng lỗi rồi thử lại.`
    : result.failed > 0
      ? `Đã nhập ${result.succeeded}/${result.total} dòng, ${result.failed} dòng lỗi bị bỏ qua.`
      : `Đã nhập thành công ${result.succeeded} ${entityLabel}.`
  return (
    <Stack spacing={1.5}>
      <Alert severity={severity}>{message}</Alert>
      <TableContainer sx={{ maxHeight: 320, border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Dòng</TableCell>
              <TableCell>{keyHeader}</TableCell>
              <TableCell>Kết quả</TableCell>
              <TableCell>Ghi chú</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result.rows.map((row) => (
              <TableRow key={row.rowNumber}>
                <TableCell>{row.rowNumber}</TableCell>
                <TableCell>{row.key || '—'}</TableCell>
                <TableCell>
                  <StatusChip label={row.success ? 'Hợp lệ' : 'Lỗi'} tone={row.success ? 'success' : 'danger'} />
                </TableCell>
                <TableCell sx={{ color: row.success ? 'text.secondary' : 'error.main' }}>{row.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  )
}
