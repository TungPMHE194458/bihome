import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type { ActiveStatus } from '@/lib/api-types'

export const ASSET_STATUS: Record<ActiveStatus, ChipStyle> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' },
}

export const ASSET_STATUS_OPTIONS: SelectOption[] = (Object.keys(ASSET_STATUS) as ActiveStatus[]).map((value) => ({
  value,
  label: ASSET_STATUS[value].label,
}))

export const UNIT_SUGGESTIONS = ['chiếc', 'cái', 'bộ', 'con']
