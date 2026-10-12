import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, useState, type ReactNode } from 'react'
import { ErrorState } from '@/components/ErrorState'
import { StatusChip } from '@/components/StatusChip'
import { SOS_STATUS, SOS_TYPE_LABEL, isOpen, sosPlace } from '@/features/sos/constants'
import { useSosAction, useSosAlert } from '@/features/sos/hooks'
import { getErrorMessage } from '@/lib/apiError'
import { formatDateTime } from '@/lib/format'
import { usePermission } from '@/stores/authStore'

interface Props {
  id?: number
  onClose: () => void
}

/** Chi tiết cảnh báo: tiếp nhận, kết thúc (đã xử lý / báo nhầm) kèm ghi chú bắt buộc. */
export function SosDetailDialog({ id, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const { data: a, isLoading, error, refetch } = useSosAlert(id)
  const action = useSosAction()
  const canWrite = usePermission('SOS_WRITE')
  const [result, setResult] = useState<'RESOLVED' | 'FALSE_ALARM'>('RESOLVED')
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')

  useEffect(() => {
    setResult('RESOLVED')
    setNote('')
    setNoteError('')
  }, [id])

  const run = async (type: 'acknowledge' | 'resolve') => {
    if (!a) return
    if (type === 'resolve' && !note.trim()) {
      setNoteError('Nhập kết quả xử lý')
      return
    }
    try {
      await action.mutateAsync(
        type === 'acknowledge'
          ? { type, id: a.id, version: a.version }
          : { type, id: a.id, version: a.version, status: result, note: note.trim() },
      )
      enqueueSnackbar(type === 'acknowledge' ? `Đã tiếp nhận ${a.code}.` : `Đã kết thúc ${a.code}.`, { variant: 'success' })
      if (type === 'resolve') onClose()
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' })
    }
  }

  const row = (label: string, value: ReactNode) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 1, py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {value || '—'}
      </Typography>
    </Box>
  )

  return (
    <Dialog open={id != null} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 7, fontWeight: 700 }}>
        Cảnh báo {a?.code ?? ''}
        <IconButton aria-label="Đóng" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isLoading || !a ? (
          <Skeleton variant="rounded" height={220} />
        ) : (
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1}>
              <StatusChip {...SOS_STATUS[a.status]} />
              <StatusChip label={SOS_TYPE_LABEL[a.alertType]} tone="danger" />
            </Stack>
            <Box>
              {row('Nơi xảy ra', sosPlace(a))}
              {row('Mô tả', a.description)}
              {row('Người báo', [a.reporterName, a.reporterPhone].filter(Boolean).join(' · '))}
              {row('Tạo lúc', `${formatDateTime(a.createdAt)}${a.createdBy ? ` bởi ${a.createdBy}` : ''}`)}
              {a.acknowledgedAt && row('Tiếp nhận', `${formatDateTime(a.acknowledgedAt)} bởi ${a.acknowledgedBy ?? ''}`)}
              {a.resolvedAt && row('Kết thúc', `${formatDateTime(a.resolvedAt)} bởi ${a.resolvedBy ?? ''}`)}
              {a.resolutionNote && row('Kết quả', a.resolutionNote)}
            </Box>
            {canWrite && isOpen(a.status) && (
              <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
                <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                  Kết thúc cảnh báo
                </Typography>
                <RadioGroup row value={result} onChange={(e) => setResult(e.target.value as 'RESOLVED' | 'FALSE_ALARM')}>
                  <FormControlLabel value="RESOLVED" control={<Radio />} label="Đã xử lý" />
                  <FormControlLabel value="FALSE_ALARM" control={<Radio />} label="Báo nhầm" />
                </RadioGroup>
                <TextField
                  label="Kết quả xử lý"
                  required
                  fullWidth
                  multiline
                  minRows={2}
                  value={note}
                  error={!!noteError}
                  helperText={noteError}
                  onChange={(e) => {
                    setNote(e.target.value)
                    setNoteError('')
                  }}
                  slotProps={{ htmlInput: { maxLength: 1000 } }}
                />
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      {a && canWrite && isOpen(a.status) && (
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          {a.status === 'NEW' && (
            <Button variant="outlined" color="warning" disabled={action.isPending} onClick={() => void run('acknowledge')}>
              Tiếp nhận
            </Button>
          )}
          <Button variant="contained" disabled={action.isPending} onClick={() => void run('resolve')}>
            Kết thúc
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}
