/** Màu BiHome (khớp frontend/src/app/theme.ts). */
export const colors = {
  primary: '#1F9D55',
  primaryDark: '#15803D',
  primaryLight: '#E8F5EC',
  text: '#1F2937',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  background: '#F4F6F8',
  card: '#FFFFFF',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  warning: '#B45309',
  warningLight: '#FEF3C7',
  info: '#1D4ED8',
  infoLight: '#DBEAFE',
  neutral: '#4B5563',
  neutralLight: '#F3F4F6',
} as const

export type Tone = 'success' | 'neutral' | 'warning' | 'danger' | 'info' | 'primary'

export const TONES: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: '#DCFCE7', fg: '#15803D' },
  neutral: { bg: colors.neutralLight, fg: colors.neutral },
  warning: { bg: colors.warningLight, fg: colors.warning },
  danger: { bg: colors.dangerLight, fg: '#B91C1C' },
  info: { bg: colors.infoLight, fg: colors.info },
  primary: { bg: colors.primaryLight, fg: colors.primaryDark },
}

export const radius = { sm: 8, md: 12, lg: 16 } as const
export const spacing = (n: number) => n * 4
