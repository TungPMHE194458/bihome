import Autocomplete from '@mui/material/Autocomplete'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, useState, type FormEvent } from 'react'
import { AuthAvatar } from '@/components/AuthImage'
import { FormDialog } from '@/components/FormDialog'
import { useAssignTicket, useAssignees } from '@/features/ticket/hooks'
import type { Assignee, TicketSummary } from '@/features/ticket/types'
import { getErrorMessage } from '@/lib/apiError'

type Target = Pick<TicketSummary, 'id' | 'code' | 'title' | 'buildingId' | 'assigneeId' | 'version'>

/** Phân công / đổi / bỏ người xử lý (chỉ người làm việc ở tòa của yêu cầu). */
export function AssignDialog({ ticket, onClose }: { ticket: Target | null; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar()
  const assign = useAssignTicket()
  const { data: assignees = [], isLoading } = useAssignees(ticket?.buildingId, !!ticket)
  const [value, setValue] = useState<Assignee | null>(null)

  useEffect(() => {
    setValue(assignees.find((a) => a.id === ticket?.assigneeId) ?? null)
  }, [ticket, assignees])

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!ticket) return
    try {
      await assign.mutateAsync({ id: ticket.id, assigneeId: value?.id ?? null, version: ticket.version })
      enqueueSnackbar(value ? `Đã phân công cho ${value.fullName}.` : 'Đã bỏ phân công.', { variant: 'success' })
      onClose()
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err), { variant: 'error' })
    }
  }

  return (
    <FormDialog
      open={!!ticket}
      title="Phân công xử lý"
      onClose={onClose}
      onSubmit={submit}
      submitting={assign.isPending}
      submitLabel="Lưu"
      maxWidth="sm"
    >
      <Stack spacing={2}>
        <Typography color="text.secondary">
          <b>{ticket?.code}</b> · {ticket?.title}
        </Typography>
        <Autocomplete
          value={value}
          options={assignees}
          loading={isLoading}
          getOptionLabel={(a) => `${a.fullName} (${a.username})`}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          onChange={(_, v) => setValue(v)}
          renderOption={(props, a) => {
            const { key, ...rest } = props
            return (
              <li key={key} {...rest}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <AuthAvatar url={a.avatarUrl} name={a.fullName} sx={{ width: 28, height: 28, fontSize: 12 }} />
                  <span>
                    {a.fullName} <Typography component="span" variant="caption" color="text.secondary">({a.username})</Typography>
                  </span>
                </Stack>
              </li>
            )
          }}
          noOptionsText="Không có người xử lý ở tòa này"
          renderInput={(params) => <TextField {...params} label="Người xử lý" placeholder="Để trống = bỏ phân công" />}
        />
      </Stack>
    </FormDialog>
  )
}
