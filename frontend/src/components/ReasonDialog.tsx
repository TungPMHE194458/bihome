import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  message?: ReactNode
  label?: string
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

/** Xác nhận kèm lý do bắt buộc (từ chối, huỷ...). */
export function ReasonDialog({
  open,
  title,
  message,
  label = 'Lý do',
  confirmLabel = 'Xác nhận',
  danger,
  loading,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  useEffect(() => {
    if (open) {
      setReason('')
      setTouched(false)
    }
  }, [open])
  const invalid = !reason.trim()
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {message && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            {message}
          </Typography>
        )}
        <TextField
          label={label}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          required
          fullWidth
          multiline
          minRows={2}
          autoFocus
          error={touched && invalid}
          helperText={touched && invalid ? 'Vui lòng nhập lý do' : undefined}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={loading}>
          Đóng
        </Button>
        <Button
          variant="contained"
          color={danger ? 'error' : 'primary'}
          disabled={loading}
          onClick={() => {
            setTouched(true)
            if (!invalid) onConfirm(reason.trim())
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
