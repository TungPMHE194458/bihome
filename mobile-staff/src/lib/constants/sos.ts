import type { IconName } from '@/components/ui'
import type { Chip } from '@/lib/constants/common'
import type { SosStatus, SosType } from '@/lib/types'

export const SOS_TYPE: Record<SosType, { label: string; icon: IconName }> = {
  FIRE: { label: 'Cháy nổ', icon: 'fire' },
  MEDICAL: { label: 'Cấp cứu y tế', icon: 'medical-bag' },
  SECURITY: { label: 'An ninh', icon: 'shield-alert' },
  ELEVATOR: { label: 'Kẹt thang máy', icon: 'elevator-passenger' },
  OTHER: { label: 'Khẩn cấp khác', icon: 'alert' },
}

export const SOS_STATUS: Record<SosStatus, Chip> = {
  NEW: { label: 'Mới', tone: 'danger' },
  ACKNOWLEDGED: { label: 'Đã tiếp nhận', tone: 'warning' },
  RESOLVED: { label: 'Đã xử lý', tone: 'success' },
  FALSE_ALARM: { label: 'Báo nhầm', tone: 'neutral' },
}
