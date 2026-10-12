import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useState } from 'react'
import { DebouncedTextField } from '@/components/DebouncedTextField'
import type { ColumnFilterDef, FilterValues } from '@/components/DataTable/types'
import { formatDate } from '@/lib/format'

interface ColumnFilterProps {
  columnKey: string
  header: string
  def: ColumnFilterDef
  values: FilterValues
  onChange: (key: string, value: string) => void
}

const funnel = (
  <InputAdornment position="start">
    <FilterAltOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
  </InputAdornment>
)

export function ColumnFilter({ columnKey, header, def, values, onChange }: ColumnFilterProps) {
  if (def.type === 'text') {
    return (
      <DebouncedTextField
        variant="standard"
        size="small"
        fullWidth
        placeholder={def.placeholder}
        value={values[columnKey] ?? ''}
        onDebouncedChange={(v) => onChange(columnKey, v)}
        slotProps={{ input: { startAdornment: funnel }, htmlInput: { 'aria-label': `Lọc ${header}` } }}
      />
    )
  }

  if (def.type === 'select') {
    return (
      <TextField
        select
        variant="standard"
        size="small"
        fullWidth
        value={values[columnKey] ?? ''}
        onChange={(e) => onChange(columnKey, e.target.value)}
        slotProps={{
          input: { startAdornment: funnel },
          select: { displayEmpty: true, SelectDisplayProps: { 'aria-label': `Lọc ${header}` } },
        }}
      >
        <MenuItem value="">
          <Box component="span" sx={{ color: 'text.disabled' }}>
            Tất cả
          </Box>
        </MenuItem>
        {def.options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
    )
  }

  return <DateRangeFilter header={header} def={def} values={values} onChange={onChange} />
}

function DateRangeFilter({
  header,
  def,
  values,
  onChange,
}: {
  header: string
  def: Extract<ColumnFilterDef, { type: 'dateRange' }>
  values: FilterValues
  onChange: (key: string, value: string) => void
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const from = values[def.fromKey] ?? ''
  const to = values[def.toKey] ?? ''
  const summary = from || to ? `${formatDate(from) || '…'} – ${formatDate(to) || '…'}` : ''

  return (
    <>
      <ButtonBase
        aria-label={`Lọc ${header}`}
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          width: '100%',
          justifyContent: 'flex-start',
          gap: 0.5,
          py: 0.5,
          borderBottom: 1,
          borderColor: 'grey.400',
          color: summary ? 'text.primary' : 'text.disabled',
          fontSize: 13,
          whiteSpace: 'nowrap',
        }}
      >
        <CalendarMonthOutlinedIcon sx={{ fontSize: 16 }} />
        {summary}
      </ButtonBase>
      <Popover
        open={!!anchor}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Stack spacing={1.5} sx={{ p: 2, width: 240 }}>
          <TextField
            type="date"
            size="small"
            label="Từ ngày"
            value={from}
            onChange={(e) => onChange(def.fromKey, e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: to || undefined } }}
          />
          <TextField
            type="date"
            size="small"
            label="Đến ngày"
            value={to}
            onChange={(e) => onChange(def.toKey, e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: from || undefined } }}
          />
          <Button
            size="small"
            disabled={!from && !to}
            onClick={() => {
              onChange(def.fromKey, '')
              onChange(def.toKey, '')
            }}
          >
            Xoá khoảng ngày
          </Button>
        </Stack>
      </Popover>
    </>
  )
}
