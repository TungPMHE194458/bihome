/** Voucher. Khớp frontend/src/features/voucher/types.ts. */
import type { ActiveStatus } from './common'

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
  /** undefined = không giới hạn. */
  totalQuantity?: number
  usedCount: number
  remaining?: number
  soldOut: boolean
  perApartmentLimit?: number
  validFrom: string
  validTo: string
  validity: Validity
  status: ActiveStatus
  amenities: VoucherTarget[]
  services: VoucherTarget[]
  /** true khi đã có lượt dùng: khoá mã / loại / giá trị / phạm vi / đối tượng. */
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
