import Chip, { type ChipProps } from '@mui/material/Chip'

export type ChipTone = 'success' | 'neutral' | 'warning' | 'danger' | 'info' | 'primary'

export const TONES: Record<ChipTone, { bg: string; fg: string }> = {
  success: { bg: '#DCFCE7', fg: '#15803D' },
  neutral: { bg: '#F3F4F6', fg: '#4B5563' },
  warning: { bg: '#FEF3C7', fg: '#B45309' },
  danger: { bg: '#FEE2E2', fg: '#B91C1C' },
  info: { bg: '#DBEAFE', fg: '#1D4ED8' },
  primary: { bg: '#E8F5EC', fg: '#15803D' },
}

export interface ChipStyle {
  label: string
  tone: ChipTone
}

interface StatusChipProps extends Omit<ChipProps, 'color' | 'label'> {
  label: string
  tone?: ChipTone
  /** Màu tuỳ chỉnh (vd màu chip danh mục do người dùng chọn), ưu tiên hơn tone. */
  color?: string
}

export function StatusChip({ label, tone = 'neutral', color, sx, ...rest }: StatusChipProps) {
  const palette = color ? { bg: `${color}22`, fg: color } : TONES[tone]
  return (
    <Chip
      size="small"
      label={label}
      sx={{ bgcolor: palette.bg, color: palette.fg, borderRadius: 1.5, ...sx }}
      {...rest}
    />
  )
}

export const ACTIVE_STATUS: Record<'ACTIVE' | 'INACTIVE', ChipStyle> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Không hoạt động', tone: 'neutral' },
}
