import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, useState, type FormEvent } from 'react'
import { FormDialog } from '@/components/FormDialog'
import { StatusChip } from '@/components/StatusChip'
import { CARD_STATUS, STATUS_ACTION } from '@/features/accesscard/constants'
import { useChangeCardStatus } from '@/features/accesscard/hooks'
import type { AccessCard, CardStatus } from '@/features/accesscard/types'
import { getErrorMessage } from '@/lib/apiError'

export interface CardStatusChange {
  card: AccessCard
  to: CardStatus
}

const HINT: Partial<Record<CardStatus, string>> = {
  REVOKED: 'Thẻ sẽ được bỏ gắn khỏi căn hộ, cư dân và xe (vẫn lưu trong lịch sử).',
  IN_STOCK: 'Thẻ quay về kho, bỏ gắn khỏi căn hộ / cư dân / xe, có thể cấp lại.',
  LOST: 'Thẻ báo mất vẫn giữ thông tin người làm mất.',
}

/** Khoá / mở khoá / báo mất / thu hồi / nhập kho, kèm ghi chú vào lịch sử thẻ. */
export function CardStatusDialog({ change, onClose }: { change: CardStatusChange | null; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar()
  const mutation = useChangeCardStatus()
  const [note, setNote] = useState('')

  useEffect(() => setNote(''), [change])

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!change) return
    try {
      await mutation.mutateAsync({ id: change.card.id, status: change.to, note: note.trim() || null, version: change.card.version })
      enqueueSnackbar(`Thẻ ${change.card.cardNo}: ${CARD_STATUS[change.to].label}.`, { variant: 'success' })
      onClose()
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err), { variant: 'error' })
    }
  }

  return (
    <FormDialog
      open={!!change}
      title={change ? STATUS_ACTION[change.to] : ''}
      onClose={onClose}
      onSubmit={submit}
      submitting={mutation.isPending}
      dirty={!!note}
      submitLabel="Xác nhận"
      maxWidth="sm"
    >
      {change && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography>
              Thẻ <b>{change.card.cardNo}</b>
            </Typography>
            <StatusChip {...CARD_STATUS[change.card.status]} />
            <Typography color="text.secondary">→</Typography>
            <StatusChip {...CARD_STATUS[change.to]} />
          </Stack>
          {HINT[change.to] && <Alert severity="info">{HINT[change.to]}</Alert>}
          <TextField
            label="Ghi chú (không bắt buộc)"
            multiline
            minRows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 1000 } }}
          />
        </Stack>
      )}
    </FormDialog>
  )
}
