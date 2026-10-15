import type { Chip } from '@/lib/constants/common'
import type { UserStatus } from '@/lib/types'

export const USER_STATUS: Record<UserStatus, Chip> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' },
  LOCKED: { label: 'Bị khoá', tone: 'danger' },
}
