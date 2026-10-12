import CloseIcon from '@mui/icons-material/Close'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog, { type DialogProps } from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import { useState, type FormEventHandler, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'

interface FormDialogProps {
  open: boolean
  title: string
  /** Thường là handleSubmit(...) của React Hook Form. */
  onSubmit: FormEventHandler<HTMLFormElement>
  onClose: () => void
  submitting?: boolean
  /** Form đã bị sửa → hỏi xác nhận trước khi đóng. */
  dirty?: boolean
  submitLabel?: string
  cancelLabel?: string
  maxWidth?: DialogProps['maxWidth']
  /** Lỗi tải dữ liệu để sửa: hiện thông báo lỗi thay cho form và khoá nút lưu (tránh lưu form trống). */
  loadError?: unknown
  onRetry?: () => void
  children: ReactNode
}

export function FormDialog({
  open,
  title,
  onSubmit,
  onClose,
  submitting = false,
  dirty = false,
  submitLabel = 'Lưu',
  cancelLabel = 'Huỷ',
  maxWidth = 'md',
  loadError,
  onRetry,
  children,
}: FormDialogProps) {
  const [confirmClose, setConfirmClose] = useState(false)

  const requestClose = () => {
    if (submitting) return
    if (dirty) setConfirmClose(true)
    else onClose()
  }

  return (
    <>
      <Dialog open={open} onClose={requestClose} maxWidth={maxWidth} fullWidth>
        <form onSubmit={loadError ? (e) => e.preventDefault() : onSubmit} noValidate>
          <DialogTitle sx={{ pr: 6, fontWeight: 700 }}>
            {title}
            <IconButton
              aria-label="Đóng"
              onClick={requestClose}
              disabled={submitting}
              sx={{ position: 'absolute', right: 12, top: 12 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>{loadError ? <ErrorState error={loadError} onRetry={onRetry} /> : children}</DialogContent>
          <DialogActions sx={{ px: 3, py: 1.5 }}>
            <Button onClick={requestClose} disabled={submitting} color="inherit">
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || !!loadError}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {submitLabel}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <ConfirmDialog
        open={confirmClose}
        title="Đóng biểu mẫu?"
        message="Các thay đổi chưa lưu sẽ bị mất. Bạn có chắc muốn đóng?"
        confirmLabel="Đóng"
        variant="danger"
        onClose={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false)
          onClose()
        }}
      />
    </>
  )
}
