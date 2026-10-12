import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, useState, type FormEvent } from 'react'
import { FormDialog } from '@/components/FormDialog'
import { FEE_ITEM_LABEL } from '@/features/feenotice/constants'
import { useUpdateFeeNotice } from '@/features/feenotice/hooks'
import {
  lineAmount,
  newItem,
  previewTotals,
  toEditable,
  toItemRequests,
  validateItems,
  type EditableItem,
} from '@/features/feenotice/schema'
import type { FeeNoticeDetail } from '@/features/feenotice/types'
import { getErrorMessage } from '@/lib/apiError'
import { formatCurrency } from '@/lib/format'

interface Props {
  notice: FeeNoticeDetail | null
  onClose: () => void
}

/** Sửa thông báo nháp: thêm / sửa / bỏ khoản, giảm trừ, hạn thanh toán; VAT tự tính lại. */
export function FeeNoticeEditDialog({ notice, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const update = useUpdateFeeNotice()
  const [rows, setRows] = useState<EditableItem[]>([])
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<number, string>>({})

  useEffect(() => {
    if (!notice) return
    setRows(toEditable(notice.items))
    setDueDate(notice.summary.dueDate)
    setNote(notice.note ?? '')
    setErrors({})
  }, [notice])

  const patch = (key: string, change: Partial<EditableItem>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...change } : r)))
  const totals = previewTotals(rows, notice?.vatPercent ?? 0)

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!notice) return
    const found = validateItems(rows)
    setErrors(found)
    if (Object.keys(found).length > 0 || !dueDate) return
    try {
      await update.mutateAsync({
        id: notice.summary.id,
        body: { dueDate, note: note.trim() || null, items: toItemRequests(rows), version: notice.summary.version },
      })
      enqueueSnackbar('Đã lưu thông báo phí.', { variant: 'success' })
      onClose()
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err), { variant: 'error' })
    }
  }

  return (
    <FormDialog
      open={!!notice}
      title={`Sửa thông báo ${notice?.summary.code ?? ''}`}
      onClose={onClose}
      onSubmit={(e) => void onSubmit(e)}
      submitting={update.isPending}
      maxWidth="lg"
    >
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            type="date"
            label="Hạn thanh toán"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            error={!dueDate}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField label="Ghi chú" value={note} onChange={(e) => setNote(e.target.value)} fullWidth slotProps={{ htmlInput: { maxLength: 1000 } }} />
        </Stack>
        <Alert severity="info" variant="outlined">
          Dòng tiện ích / dịch vụ và nợ kỳ trước do hệ thống tạo: chỉ bỏ được (khoản tiện ích bỏ ra sẽ vào kỳ sau). VAT{' '}
          {notice?.vatPercent ?? 0}% tính lại khi lưu.
        </Alert>
        {rows.map((r, i) => {
          const system = r.type === 'SERVICE' || r.type === 'PREVIOUS_DEBT'
          const amount = lineAmount(r)
          return (
            <Box
              key={r.key}
              role="group"
              aria-label={`Khoản ${i + 1}`}
              sx={{ display: 'grid', gap: 1, alignItems: 'start', gridTemplateColumns: { xs: '1fr', md: '130px 1fr 110px 130px 150px 40px' } }}
            >
              <Typography variant="body2" sx={{ pt: 1.2, fontWeight: 600 }}>
                {FEE_ITEM_LABEL[r.type]}
              </Typography>
              <TextField
                size="small"
                label="Nội dung"
                value={r.description}
                disabled={system}
                error={!!errors[i]}
                helperText={errors[i]}
                onChange={(e) => patch(r.key, { description: e.target.value })}
              />
              <TextField
                size="small"
                label="Số lượng"
                value={r.quantity}
                disabled={system || r.type === 'DISCOUNT'}
                onChange={(e) => patch(r.key, { quantity: e.target.value })}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
              <TextField
                size="small"
                label="Đơn giá"
                value={r.unitPrice}
                disabled={system || r.type === 'DISCOUNT'}
                onChange={(e) => patch(r.key, { unitPrice: e.target.value })}
                slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              />
              {r.quantity && r.unitPrice && r.type !== 'DISCOUNT' ? (
                <Typography variant="body2" sx={{ pt: 1.2, textAlign: 'right' }}>
                  {formatCurrency(amount)}
                </Typography>
              ) : (
                <TextField
                  size="small"
                  label={r.type === 'DISCOUNT' ? 'Số tiền giảm' : 'Thành tiền'}
                  value={r.amount}
                  disabled={system}
                  onChange={(e) => patch(r.key, { amount: e.target.value })}
                  slotProps={{ htmlInput: { inputMode: 'numeric' } }}
                />
              )}
              <Tooltip title="Bỏ khoản">
                <IconButton aria-label={`Bỏ khoản ${i + 1}`} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )
        })}
        <Stack direction="row" spacing={1}>
          <Button startIcon={<AddIcon />} onClick={() => setRows((rs) => [...rs, newItem('OTHER')])}>
            Thêm khoản
          </Button>
          <Button startIcon={<AddIcon />} color="warning" onClick={() => setRows((rs) => [...rs, newItem('DISCOUNT')])}>
            Thêm giảm trừ
          </Button>
        </Stack>
        <Stack direction="row" spacing={3} justifyContent="flex-end">
          <Typography variant="body2">VAT: {formatCurrency(totals.vat)}</Typography>
          <Typography variant="body1" fontWeight={700}>
            Tổng cộng: {formatCurrency(totals.total)}
          </Typography>
        </Stack>
      </Stack>
    </FormDialog>
  )
}
