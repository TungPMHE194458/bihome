import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type { ApplyScope, DiscountType, Validity, Voucher } from '@/features/voucher/types'
import { formatCurrency } from '@/lib/format'

export const DISCOUNT_TYPE: Record<DiscountType, string> = { PERCENT: 'Giảm theo %', AMOUNT: 'Giảm số tiền' }
export const APPLY_SCOPE: Record<ApplyScope, string> = { AMENITY: 'Tiện ích', SERVICE: 'Dịch vụ', ALL: 'Tất cả' }
export const VALIDITY: Record<Validity, ChipStyle> = {
  UPCOMING: { label: 'Sắp diễn ra', tone: 'info' },
  VALID: { label: 'Đang hiệu lực', tone: 'success' },
  EXPIRED: { label: 'Hết hạn', tone: 'danger' },
}
export const VOUCHER_STATUS: Record<'ACTIVE' | 'INACTIVE', ChipStyle> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' },
}

const options = <K extends string>(map: Record<K, string | ChipStyle>): SelectOption[] =>
  (Object.keys(map) as K[]).map((value) => {
    const v = map[value]
    return { value, label: typeof v === 'string' ? v : v.label }
  })

export const DISCOUNT_TYPE_OPTIONS = options(DISCOUNT_TYPE)
export const APPLY_SCOPE_OPTIONS = options(APPLY_SCOPE)
export const VALIDITY_OPTIONS = options(VALIDITY)
export const VOUCHER_STATUS_OPTIONS = options(VOUCHER_STATUS)

/** "10% (tối đa 50.000 ₫)" / "50.000 ₫". */
export function formatDiscount(v: Pick<Voucher, 'discountType' | 'discountValue' | 'maxDiscount'>): string {
  if (v.discountType === 'AMOUNT') return formatCurrency(v.discountValue)
  const percent = `${Number(v.discountValue).toLocaleString('vi-VN')}%`
  return v.maxDiscount ? `${percent} (tối đa ${formatCurrency(v.maxDiscount)})` : percent
}

/** Tên các tiện ích / dịch vụ cụ thể của voucher; rỗng = áp dụng cho tất cả trong phạm vi. */
export function formatTargets(v: Pick<Voucher, 'amenities' | 'services'>): string {
  return [...v.amenities, ...v.services].map((t) => t.name).join(', ')
}
