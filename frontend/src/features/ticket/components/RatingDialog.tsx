import FormHelperText from '@mui/material/FormHelperText'
import Rating from '@mui/material/Rating'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useSnackbar } from 'notistack'
import { useEffect, useState, type FormEvent } from 'react'
import { FormDialog } from '@/components/FormDialog'
import { useRateTicket } from '@/features/ticket/hooks'
import type { TicketDetail } from '@/features/ticket/types'
import { getErrorMessage } from '@/lib/apiError'

/** Ghi nhận đánh giá 1–5 sao của cư dân (khi yêu cầu đã Hoàn thành / Đóng). */
export function RatingDialog({ detail, onClose }: { detail: TicketDetail | null; onClose: () => void }) {
  const { enqueueSnackbar } = useSnackbar()
  const rate = useRateTicket()
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string>()

  useEffect(() => {
    setRating(detail?.ticket.rating ?? null)
    setComment(detail?.ratingComment ?? '')
    setError(undefined)
  }, [detail])

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!detail) return
    if (!rating) {
      setError('Vui lòng chọn số sao.')
      return
    }
    try {
      await rate.mutateAsync({ id: detail.ticket.id, rating, comment: comment.trim() || null })
      enqueueSnackbar('Đã ghi nhận đánh giá.', { variant: 'success' })
      onClose()
    } catch (err) {
      enqueueSnackbar(getErrorMessage(err), { variant: 'error' })
    }
  }

  return (
    <FormDialog open={!!detail} title="Đánh giá của cư dân" onClose={onClose} onSubmit={submit} submitting={rate.isPending} maxWidth="xs">
      <Stack spacing={2} alignItems="flex-start">
        <Typography color="text.secondary">Mức độ hài lòng với kết quả xử lý</Typography>
        <Rating
          value={rating}
          onChange={(_, v) => {
            setRating(v)
            setError(undefined)
          }}
          size="large"
        />
        {error && <FormHelperText error>{error}</FormHelperText>}
        <TextField
          label="Nhận xét"
          fullWidth
          multiline
          minRows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />
      </Stack>
    </FormDialog>
  )
}
