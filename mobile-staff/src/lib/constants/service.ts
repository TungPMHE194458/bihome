import type { Chip } from '@/lib/constants/common'
import type { ServiceOrderStatus } from '@/lib/types'

export const SERVICE_STATUS: Record<'ACTIVE' | 'INACTIVE', Chip> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' },
}

export const ORDER_STATUS: Record<ServiceOrderStatus, Chip> = {
  PENDING: { label: 'Chờ xác nhận', tone: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'info' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

export const SERVICE_UNIT_SUGGESTIONS = ['lần', 'giờ', 'm²', 'kg', 'bộ', 'chiếc', 'chuyến']
