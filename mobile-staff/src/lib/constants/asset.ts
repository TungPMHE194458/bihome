import type { Chip } from '@/lib/constants/common'

export const ASSET_STATUS: Record<'ACTIVE' | 'INACTIVE', Chip> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' },
}

export const ASSET_UNIT_SUGGESTIONS = ['chiếc', 'cái', 'bộ', 'con']

export function willBeInactive(exitDate?: string | null): boolean {
  if (!exitDate) return false
  return exitDate <= new Date().toISOString().slice(0, 10)
}
