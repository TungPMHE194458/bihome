import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { PAYMENT_METHOD } from '@/features/transaction/constants'
import type { PaymentMethod } from '@/features/transaction/types'
import { formatCurrency } from '@/lib/format'

interface Props {
  open: boolean
  /** vd "đăng ký DK-261011-001". */
  subject: string
  amount: number
  loading?: boolean
  onClose: () => void
  onConfirm: (method: PaymentMethod) => void
}

/** Ghi nhận thanh toán: chọn phương thức. */
export function PayDialog({ open, subject, amount, loading, onClose, onConfirm }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  useEffect(() => {
    if (open) setMethod('CASH')
  }, [open])
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Ghi nhận thanh toán</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Thu <b>{formatCurrency(amount)}</b> cho {subject}.
        </Typography>
        <RadioGroup value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} aria-label="Phương thức thanh toán">
          {(Object.keys(PAYMENT_METHOD) as PaymentMethod[]).map((m) => (
            <FormControlLabel key={m} value={m} control={<Radio size="small" />} label={PAYMENT_METHOD[m]} />
          ))}
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={loading}>
          Huỷ
        </Button>
        <Button variant="contained" onClick={() => onConfirm(method)} disabled={loading}>
          Xác nhận đã thu
        </Button>
      </DialogActions>
    </Dialog>
  )
}
