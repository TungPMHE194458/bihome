import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import FormHelperText from '@mui/material/FormHelperText'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { formatSlotPrice } from '@/features/booking/constants'
import type { DayAvailability } from '@/features/booking/types'

interface Props {
  day?: DayAvailability
  loading?: boolean
  /** "HH:mm-HH:mm" */
  value: string
  onChange: (value: string) => void
  error?: string
}

/** Lưới khung giờ của một ngày: còn bao nhiêu chỗ, giá; khung đã qua / kín chỗ thì không chọn được. */
export function SlotPicker({ day, loading, value, onChange, error }: Props) {
  if (loading) return <Skeleton variant="rounded" height={96} />
  if (!day) return null
  if (day.closedReason) return <Alert severity="warning">{day.closedReason}</Alert>
  return (
    <Box>
      <Box
        role="radiogroup"
        aria-label="Khung giờ"
        sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))' }}
      >
        {day.slots.map((s) => {
          const key = `${s.startTime}-${s.endTime}`
          const disabled = s.past || s.remaining <= 0
          const selected = key === value
          return (
            <ButtonBase
              key={key}
              role="radio"
              aria-checked={selected}
              aria-label={`${s.startTime}–${s.endTime}`}
              disabled={disabled}
              onClick={() => onChange(key)}
              sx={{
                display: 'block',
                textAlign: 'left',
                p: 1,
                borderRadius: 1.5,
                border: 1,
                borderColor: selected ? 'primary.main' : 'divider',
                bgcolor: selected ? 'rgba(31, 157, 85, 0.08)' : disabled ? 'grey.50' : 'background.paper',
                opacity: disabled ? 0.55 : 1,
              }}
            >
              <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {s.startTime}–{s.endTime}
              </Typography>
              <Typography variant="caption" component="div" color={s.remaining <= 0 ? 'error.main' : 'text.secondary'}>
                {s.past ? 'Đã qua' : s.remaining <= 0 ? 'Kín chỗ' : `Còn ${s.remaining}/${s.capacity} chỗ`}
              </Typography>
              <Typography variant="caption" component="div" color={s.price ? 'warning.dark' : 'success.main'}>
                {formatSlotPrice(s)}
              </Typography>
            </ButtonBase>
          )
        })}
      </Box>
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  )
}
