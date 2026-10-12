import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, useState, type FormEvent } from 'react'
import { FormDialog } from '@/components/FormDialog'
import { StatusChip } from '@/components/StatusChip'
import { STATUS_ACTION, TICKET_STATUS } from '@/features/ticket/constants'
import { useChangeTicketStatus } from '@/features/ticket/hooks'
import type { TicketStatus, TicketSummary, Visibility } from '@/features/ticket/types'
import { getErrorMessage, getProblem } from '@/lib/apiError'

export interface StatusChange {
  ticket: Pick<TicketSummary, 'id' | 'code' | 'title' | 'status' | 'version' | 'assigneeId'>
  to: TicketStatus
}

/** Chuyển trạng thái kèm ghi chú (bắt buộc khi Huỷ) và phạm vi hiển thị của ghi chú. */
export function StatusChangeDialog({ change, onClose }: { change: StatusChange | null; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar()
  const mutation = useChangeTicketStatus()
  const [note, setNote] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('PUBLIC')
  const [error, setError] = useState<string>()
  const cancelling = change?.to === 'CANCELLED'

  useEffect(() => {
    setNote('')
    setVisibility('PUBLIC')
    setError(undefined)
  }, [change])

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!change) return
    if (cancelling && !note.trim()) {
      setError('Vui lòng nhập lý do huỷ.')
      return
    }
    try {
      await mutation.mutateAsync({
        id: change.ticket.id,
        status: change.to,
        note: note.trim() || null,
        visibility,
        version: change.ticket.version,
      })
      enqueueSnackbar(`${change.ticket.code}: ${TICKET_STATUS[change.to].label}.`, { variant: 'success' })
      onClose()
    } catch (err) {
      const field = getProblem(err)?.errors?.[0]
      if (field?.field === 'note') setError(field.message)
      else enqueueSnackbar(getErrorMessage(err), { variant: 'error' })
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
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography>
              <b>{change.ticket.code}</b> · {change.ticket.title}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <StatusChip {...TICKET_STATUS[change.ticket.status]} />
            <Typography color="text.secondary">→</Typography>
            <StatusChip {...TICKET_STATUS[change.to]} />
          </Stack>
          {(change.to === 'IN_PROGRESS' || change.to === 'DONE') && change.ticket.assigneeId == null && (
            <Typography variant="body2" color="text.secondary">
              Yêu cầu chưa có người xử lý — bạn sẽ được phân công.
            </Typography>
          )}
          <TextField
            label={cancelling ? 'Lý do huỷ' : 'Ghi chú (không bắt buộc)'}
            required={cancelling}
            multiline
            minRows={3}
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              setError(undefined)
            }}
            error={!!error}
            helperText={error}
            slotProps={{ htmlInput: { maxLength: 2000 } }}
          />
          <RadioGroup row value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
            <FormControlLabel value="PUBLIC" control={<Radio size="small" />} label="Cư dân xem được" />
            <FormControlLabel value="INTERNAL" control={<Radio size="small" />} label="Chỉ nội bộ" />
          </RadioGroup>
        </Stack>
      )}
    </FormDialog>
  )
}
