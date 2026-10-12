import type { ChipStyle } from '@/components/StatusChip'
import type { SelectOption } from '@/components/DataTable/types'
import type { UserStatus } from '@/features/auth/types'

export const USER_STATUS: Record<UserStatus, ChipStyle> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' },
  LOCKED: { label: 'Bị khoá', tone: 'danger' },
}

export const USER_STATUS_OPTIONS: SelectOption[] = (Object.keys(USER_STATUS) as UserStatus[]).map((value) => ({
  value,
  label: USER_STATUS[value].label,
}))
