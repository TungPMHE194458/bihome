import Alert from '@mui/material/Alert'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { useSnackbar } from 'notistack'
import { useEffect, useState, type FormEvent } from 'react'
import { FormDialog } from '@/components/FormDialog'
import { RESIDENT_ROLE } from '@/features/resident/constants'
import { useMoveOut } from '@/features/resident/hooks'
import type { ResidenceStatus, ResidentRole } from '@/features/resident/types'
import { getErrorMessage, getProblem } from '@/lib/apiError'
import dayjs from '@/lib/dayjs'

export interface MoveOutTarget {
  id: number
  fullName: string
  apartments: {
    id: number
    apartmentCode: string
    apartmentName: string
    role: ResidentRole
    residenceStatus: ResidenceStatus
  }[]
}

interface MoveOutDialogProps {
  resident: MoveOutTarget | null
  /** Chỉ chọn sẵn một căn (vd từ dòng lịch sử cư trú); bỏ trống = mọi căn đang ở. */
  linkId?: number
  onClose: () => void
}

/** Chuyển đi: đặt ngày chuyển đi (không sau hôm nay) cho các căn đã chọn và bỏ cờ chủ hộ chính. */
export function MoveOutDialog({ resident, linkId, onClose }: MoveOutDialogProps) {
  const { enqueueSnackbar } = useSnackbar()
  const moveOut = useMoveOut()
  const active = resident?.apartments.filter((a) => a.residenceStatus !== 'MOVED_OUT') ?? []
  const [date, setDate] = useState(dayjs())
  const [selected, setSelected] = useState<number[]>([])
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (!resident) return
    setDate(dayjs())
    setError(undefined)
    setSelected(linkId != null ? [linkId] : resident.apartments.filter((a) => a.residenceStatus !== 'MOVED_OUT').map((a) => a.id))
  }, [resident, linkId])

  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!resident) return
    if (!date.isValid() || date.isAfter(dayjs(), 'day')) {
      setError('Ngày chuyển đi không được sau hôm nay.')
      return
    }
    if (selected.length === 0) {
      setError('Chọn ít nhất một căn hộ.')
      return
    }
    try {
      const all = selected.length === active.length
      await moveOut.mutateAsync({
        id: resident.id,
        moveOutDate: date.format('YYYY-MM-DD'),
        linkIds: all ? undefined : selected,
      })
      enqueueSnackbar(`Đã chuyển đi cho ${resident.fullName}.`, { variant: 'success' })
      onClose()
    } catch (err) {
      const field = getProblem(err)?.errors?.[0]
      if (field) setError(field.message)
      else enqueueSnackbar(getErrorMessage(err), { variant: 'error' })
    }
  }

  return (
    <FormDialog
      open={!!resident}
      title="Chuyển đi"
      onClose={onClose}
      onSubmit={submit}
      submitting={moveOut.isPending}
      submitLabel="Xác nhận chuyển đi"
    >
      <Stack spacing={2}>
        <Typography>
          Cư dân <b>{resident?.fullName}</b> sẽ chuyển sang <b>Đã chuyển đi</b> tại các căn hộ đã chọn.
        </Typography>
        {active.length === 0 ? (
          <Alert severity="info">Cư dân không còn ở căn hộ nào.</Alert>
        ) : (
          <Stack>
            {active.map((a) => (
              <FormControlLabel
                key={a.id}
                control={<Checkbox checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />}
                label={`${a.apartmentName} (${a.apartmentCode}) · ${RESIDENT_ROLE[a.role].label}`}
              />
            ))}
          </Stack>
        )}
        <DatePicker
          label="Ngày chuyển đi"
          format="DD/MM/YYYY"
          value={date}
          onChange={(v) => v && setDate(v)}
          disableFuture
          slotProps={{ textField: { required: true, fullWidth: true } }}
        />
        {error && <FormHelperText error>{error}</FormHelperText>}
        <Alert severity="warning">Thẻ từ đang gán cho cư dân tại các căn này sẽ bị thu hồi (khi có module Thẻ từ).</Alert>
      </Stack>
    </FormDialog>
  )
}
