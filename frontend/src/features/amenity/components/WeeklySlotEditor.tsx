import AddIcon from '@mui/icons-material/Add'
import AutoFixHighOutlinedIcon from '@mui/icons-material/AutoFixHighOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { DAYS, generateSlots, sortSlots } from '@/features/amenity/constants'
import type { Slot } from '@/features/amenity/types'

interface Props {
  slots: Slot[]
  onChange: (slots: Slot[]) => void
  openTime: string
  closeTime: string
  slotMinutes: number
  capacity: number
  disabled?: boolean
}

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const timeProps = { inputLabel: { shrink: true }, htmlInput: { step: 300 } }

/**
 * Khung giờ theo thứ trong tuần: mỗi cột một thứ; sinh tự động từ giờ mở cửa + thời lượng lượt, sao chép một thứ
 * sang các thứ khác, bấm vào khung để sửa / xoá.
 */
export function WeeklySlotEditor({ slots, onChange, openTime, closeTime, slotMinutes, capacity, disabled }: Props) {
  const [generator, setGenerator] = useState<HTMLElement | null>(null)
  const [generateDays, setGenerateDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7])
  const [dayMenu, setDayMenu] = useState<{ anchor: HTMLElement; day: number } | null>(null)
  const [editing, setEditing] = useState<{ anchor: HTMLElement; index: number; draft: Slot } | null>(null)

  const sorted = sortSlots(slots)
  const ofDay = (day: number) => sorted.filter((s) => s.dayOfWeek === day)

  const replaceDays = (days: number[], next: Slot[]) =>
    onChange(sortSlots([...slots.filter((s) => !days.includes(s.dayOfWeek)), ...next]))

  const addSlot = (day: number) => {
    const last = ofDay(day).at(-1)
    const start = last ? toMinutes(last.endTime) : toMinutes(openTime)
    const end = Math.min(start + slotMinutes, toMinutes(closeTime))
    if (end <= start) return
    onChange(sortSlots([...slots, { dayOfWeek: day, startTime: toTime(start), endTime: toTime(end), capacity: null }]))
  }

  const copyDay = (from: number) => {
    const source = ofDay(from)
    const targets = DAYS.map((d) => d.value as number).filter((d) => d !== from)
    replaceDays(targets, targets.flatMap((day) => source.map((s) => ({ ...s, dayOfWeek: day }))))
  }

  const indexOf = (slot: Slot) => slots.indexOf(slot)

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AutoFixHighOutlinedIcon />}
          onClick={(e) => setGenerator(e.currentTarget)}
          disabled={disabled}
        >
          Sinh khung giờ tự động
        </Button>
        <Button
          size="small"
          color="inherit"
          startIcon={<DeleteSweepOutlinedIcon />}
          onClick={() => onChange([])}
          disabled={disabled || slots.length === 0}
        >
          Xoá tất cả
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
          {slots.length} khung giờ · giờ mở cửa {openTime}–{closeTime}
        </Typography>
      </Stack>

      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(7, minmax(0, 1fr))' } }}>
        {DAYS.map((d) => {
          const daySlots = ofDay(d.value)
          return (
            <Box key={d.value} role="group" aria-label={d.label} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: d.value >= 6 ? 'grey.50' : 'background.paper', minWidth: 0 }}>
              <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
                  {d.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {daySlots.length}
                </Typography>
                <IconButton
                  size="small"
                  aria-label={`Tác vụ ${d.label}`}
                  disabled={disabled}
                  onClick={(e) => setDayMenu({ anchor: e.currentTarget, day: d.value })}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Stack spacing={0.5} sx={{ p: 0.75 }}>
                {daySlots.length === 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', py: 1 }}>
                    Đóng cửa
                  </Typography>
                )}
                {daySlots.map((s) => (
                  <Chip
                    key={`${s.dayOfWeek}-${s.startTime}`}
                    size="small"
                    variant="outlined"
                    color="primary"
                    label={
                      <span>
                        {s.startTime}–{s.endTime}
                        {s.capacity ? <Box component="span" sx={{ color: 'text.secondary' }}> · {s.capacity}</Box> : null}
                      </span>
                    }
                    onClick={disabled ? undefined : (e) => setEditing({ anchor: e.currentTarget, index: indexOf(s), draft: { ...s } })}
                    sx={{ justifyContent: 'flex-start', fontVariantNumeric: 'tabular-nums' }}
                  />
                ))}
                <Button size="small" startIcon={<AddIcon />} onClick={() => addSlot(d.value)} disabled={disabled} aria-label={`Thêm khung ${d.label}`}>
                  Thêm
                </Button>
              </Stack>
            </Box>
          )
        })}
      </Box>

      {/* Sinh khung giờ cho các thứ đã chọn (thay khung cũ của các thứ đó). */}
      <Popover open={!!generator} anchorEl={generator} onClose={() => setGenerator(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Stack spacing={1.5} sx={{ p: 2, maxWidth: 380 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Sinh lượt {slotMinutes} phút từ {openTime} đến {closeTime}
          </Typography>
          <ToggleButtonGroup size="small" value={generateDays} onChange={(_, v: number[]) => setGenerateDays(v)} aria-label="Chọn thứ">
            {DAYS.map((d) => (
              <ToggleButton key={d.value} value={d.value} aria-label={d.label}>
                {d.short}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary">
            Khung giờ hiện có của các thứ đã chọn sẽ được thay thế.
          </Typography>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button size="small" color="inherit" onClick={() => setGenerator(null)}>
              Huỷ
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={generateDays.length === 0}
              onClick={() => {
                replaceDays(generateDays, generateSlots(generateDays, openTime, closeTime, slotMinutes))
                setGenerator(null)
              }}
            >
              Sinh khung giờ
            </Button>
          </Stack>
        </Stack>
      </Popover>

      <Menu anchorEl={dayMenu?.anchor} open={!!dayMenu} onClose={() => setDayMenu(null)}>
        <MenuItem
          disabled={!dayMenu || ofDay(dayMenu.day).length === 0}
          onClick={() => {
            if (dayMenu) copyDay(dayMenu.day)
            setDayMenu(null)
          }}
        >
          <ListItemIcon>
            <ContentCopyOutlinedIcon fontSize="small" />
          </ListItemIcon>
          Sao chép sang các ngày khác
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (dayMenu) replaceDays([dayMenu.day], [])
            setDayMenu(null)
          }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          Đóng cửa cả ngày (xoá khung giờ)
        </MenuItem>
      </Menu>

      {/* Sửa một khung giờ. */}
      <Popover open={!!editing} anchorEl={editing?.anchor} onClose={() => setEditing(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        {editing && (
          <Stack spacing={1.5} sx={{ p: 2, width: 280 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {DAYS[editing.draft.dayOfWeek - 1].label}
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Bắt đầu"
                type="time"
                size="small"
                value={editing.draft.startTime}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, startTime: e.target.value } })}
                slotProps={timeProps}
              />
              <TextField
                label="Kết thúc"
                type="time"
                size="small"
                value={editing.draft.endTime}
                onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, endTime: e.target.value } })}
                slotProps={timeProps}
              />
            </Stack>
            <TextField
              label="Sức chứa riêng"
              size="small"
              value={editing.draft.capacity ?? ''}
              placeholder={`Mặc định ${capacity}`}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '')
                setEditing({ ...editing, draft: { ...editing.draft, capacity: v ? Number(v) : null } })
              }}
              helperText="Bỏ trống = theo sức chứa tiện ích"
            />
            <Stack direction="row" spacing={1} justifyContent="space-between">
              <Button
                size="small"
                color="error"
                startIcon={<DeleteOutlineIcon />}
                onClick={() => {
                  onChange(slots.filter((_, i) => i !== editing.index))
                  setEditing(null)
                }}
              >
                Xoá
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={!editing.draft.startTime || !editing.draft.endTime || editing.draft.endTime <= editing.draft.startTime}
                onClick={() => {
                  onChange(sortSlots(slots.map((s, i) => (i === editing.index ? editing.draft : s))))
                  setEditing(null)
                }}
              >
                Áp dụng
              </Button>
            </Stack>
          </Stack>
        )}
      </Popover>
    </Box>
  )
}
