import AddIcon from '@mui/icons-material/Add'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { TONES } from '@/components/StatusChip'
import { DAYS } from '@/features/amenity/constants'
import type { AmenityOption } from '@/features/amenity/types'
import { BOOKING_STATUS } from '@/features/booking/constants'
import { useBookingCalendar } from '@/features/booking/hooks'
import type { CalendarBooking } from '@/features/booking/types'
import dayjs from '@/lib/dayjs'

interface Props {
  amenities: AmenityOption[]
  amenityId?: number
  onAmenityChange: (id: number | undefined) => void
  /** YYYY-MM-DD của thứ 2 đầu tuần. */
  weekStart: string
  onWeekChange: (weekStart: string) => void
  onOpen: (bookingId: number) => void
  onCreate?: (preset: { amenityId: number; bookingDate: string; slot: string }) => void
}

export const mondayOf = (d: dayjs.Dayjs) => d.subtract((d.day() + 6) % 7, 'day').startOf('day')

/** Lịch tuần của một tiện ích: mỗi cột một ngày, mỗi khung giờ hiện số chỗ đã đặt và các lượt đăng ký. */
export function BookingCalendar({ amenities, amenityId, onAmenityChange, weekStart, onWeekChange, onOpen, onCreate }: Props) {
  const { data, isLoading, isFetching } = useBookingCalendar(amenityId, weekStart, 7)
  const start = dayjs(weekStart)
  const selected = amenities.find((a) => a.id === amenityId) ?? null
  const bookingsAt = (date: string, startTime: string): CalendarBooking[] =>
    data?.bookings.filter((b) => b.bookingDate === date && b.startTime === startTime) ?? []

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Autocomplete
          value={selected}
          options={amenities}
          getOptionLabel={(o) => `${o.name} (${o.code})`}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          onChange={(_, v) => onAmenityChange(v?.id)}
          sx={{ width: 280 }}
          size="small"
          renderInput={(p) => <TextField {...p} label="Tiện ích" />}
        />
        <IconButton aria-label="Tuần trước" onClick={() => onWeekChange(start.subtract(7, 'day').format('YYYY-MM-DD'))}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography fontWeight={700} sx={{ minWidth: 190, textAlign: 'center' }}>
          {start.format('DD/MM')} – {start.add(6, 'day').format('DD/MM/YYYY')}
        </Typography>
        <IconButton aria-label="Tuần sau" onClick={() => onWeekChange(start.add(7, 'day').format('YYYY-MM-DD'))}>
          <ChevronRightIcon />
        </IconButton>
        <Button size="small" onClick={() => onWeekChange(mondayOf(dayjs()).format('YYYY-MM-DD'))}>
          Tuần này
        </Button>
        {data && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            {data.bookings.length} lượt đang giữ chỗ trong tuần
          </Typography>
        )}
      </Stack>

      {amenityId == null ? (
        <Alert severity="info">Chọn một tiện ích để xem lịch theo tuần.</Alert>
      ) : isLoading || !data ? (
        <Skeleton variant="rounded" height={360} />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 1,
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(7, minmax(0, 1fr))' },
            opacity: isFetching ? 0.6 : 1,
          }}
        >
          {data.availability.days.map((day, i) => {
            const date = dayjs(day.date)
            const isToday = date.isSame(dayjs(), 'day')
            return (
              <Box
                key={day.date}
                role="group"
                aria-label={`${DAYS[i].label} ${date.format('DD/MM')}`}
                sx={{ border: 1, borderColor: isToday ? 'primary.main' : 'divider', borderRadius: 2, minWidth: 0, bgcolor: 'background.paper' }}
              >
                <Box sx={{ px: 1, py: 0.75, borderBottom: 1, borderColor: 'divider', bgcolor: isToday ? 'rgba(31,157,85,0.08)' : 'grey.50' }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {DAYS[(date.day() + 6) % 7].label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {date.format('DD/MM')}
                  </Typography>
                </Box>
                <Stack spacing={0.75} sx={{ p: 0.75 }}>
                  {day.closedReason && day.slots.length === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                      {day.closedReason}
                    </Typography>
                  ) : (
                    <>
                      {day.closedReason && (
                        <Typography variant="caption" color="warning.dark">
                          {day.closedReason}
                        </Typography>
                      )}
                      {day.slots.map((s) => {
                        const list = bookingsAt(day.date, s.startTime)
                        const bookable = !day.closedReason && !s.past && s.remaining > 0
                        if (list.length === 0 && !bookable) {
                          return (
                            <Typography key={s.startTime} variant="caption" color="text.disabled" sx={{ px: 0.5 }}>
                              {s.startTime}–{s.endTime}
                            </Typography>
                          )
                        }
                        const ratio = s.capacity ? Math.min(1, s.booked / s.capacity) : 0
                        return (
                          <Box key={s.startTime} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography variant="caption" fontWeight={700} sx={{ flex: 1, fontVariantNumeric: 'tabular-nums' }}>
                                {s.startTime}–{s.endTime}
                              </Typography>
                              <Typography variant="caption" color={s.remaining <= 0 ? 'error.main' : 'text.secondary'}>
                                {s.booked}/{s.capacity}
                              </Typography>
                              {bookable && onCreate && (
                                <Tooltip title="Đăng ký khung này">
                                  <IconButton
                                    size="small"
                                    aria-label={`Đăng ký ${s.startTime} ${date.format('DD/MM')}`}
                                    onClick={() => onCreate({ amenityId, bookingDate: day.date, slot: `${s.startTime}-${s.endTime}` })}
                                    sx={{ p: 0.25 }}
                                  >
                                    <AddIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                            <Box sx={{ height: 3, borderRadius: 2, bgcolor: 'grey.100', my: 0.5 }}>
                              <Box sx={{ height: '100%', width: `${ratio * 100}%`, borderRadius: 2, bgcolor: ratio >= 1 ? 'error.main' : 'primary.main' }} />
                            </Box>
                            <Stack spacing={0.25}>
                              {list.map((b) => {
                                const tone = TONES[BOOKING_STATUS[b.status].tone]
                                return (
                                  <ButtonBase
                                    key={b.id}
                                    onClick={() => onOpen(b.id)}
                                    aria-label={`Mở ${b.code}`}
                                    sx={{ justifyContent: 'flex-start', px: 0.5, py: 0.25, borderRadius: 0.75, bgcolor: tone.bg, color: tone.fg }}
                                  >
                                    <Typography variant="caption" noWrap>
                                      {b.apartmentCode} · {b.peopleCount} người
                                    </Typography>
                                  </ButtonBase>
                                )
                              })}
                            </Stack>
                          </Box>
                        )
                      })}
                    </>
                  )}
                </Stack>
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
