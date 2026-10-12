import type { ActiveStatus } from '@/lib/api-types'

export type DiscountType = 'PERCENT' | 'AMOUNT'
export type ApplyScope = 'AMENITY' | 'SERVICE' | 'ALL'
export type Validity = 'UPCOMING' | 'VALID' | 'EXPIRED'

export interface VoucherTarget {
  id: number
  code: string
  name: string
}

export interface Voucher {
  id: number
  buildingId: number
  buildingName: string
  code: string
  name: string
  description?: string
  discountType: DiscountType
  discountValue: number
  maxDiscount?: number
  applyScope: ApplyScope
  /** Không có = không giới hạn. */
  totalQuantity?: number
  usedCount: number
  remaining?: number
  soldOut: boolean
  perApartmentLimit?: number
  validFrom: string
  validTo: string
  validity: Validity
  status: ActiveStatus
  /** Tiện ích / dịch vụ cụ thể; rỗng = mọi tiện ích / dịch vụ trong phạm vi. */
  amenities: VoucherTarget[]
  services: VoucherTarget[]
  /** Đã có lượt dùng: không sửa được loại / giá trị giảm, phạm vi, đối tượng áp dụng, mã. */
  valueLocked: boolean
  createdAt: string
  updatedAt: string
  createdBy?: string
  version: number
}

export interface VoucherRequest {
  code: string
  name: string
  description: string | null
  discountType: DiscountType
  discountValue: number
  maxDiscount: number | null
  applyScope: ApplyScope
  amenityIds: number[]
  serviceIds: number[]
  totalQuantity: number | null
  perApartmentLimit: number | null
  validFrom: string
  validTo: string
  status: ActiveStatus
  version?: number
}
