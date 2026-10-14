import type { Chip } from '@/lib/constants/common'
import type { ApplyScope, DiscountType, Validity } from '@/lib/types'

export const DISCOUNT_TYPE: Record<DiscountType, string> = {
  PERCENT: 'Giảm theo %',
  AMOUNT: 'Giảm số tiền',
}

export const APPLY_SCOPE: Record<ApplyScope, string> = {
  AMENITY: 'Tiện ích',
  SERVICE: 'Dịch vụ',
  ALL: 'Tất cả',
}

export const VALIDITY: Record<Validity, Chip> = {
  UPCOMING: { label: 'Sắp diễn ra', tone: 'info' },
  VALID: { label: 'Đang hiệu lực', tone: 'success' },
  EXPIRED: { label: 'Hết hạn', tone: 'danger' },
}

export const VOUCHER_STATUS: Record<'ACTIVE' | 'INACTIVE', Chip> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' },
}
