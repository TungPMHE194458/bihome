import type { Chip } from '@/lib/constants/common'
import type { ApartmentType, OwnershipType, UsageStatus } from '@/lib/types'

export const APARTMENT_TYPE: Record<ApartmentType, Chip> = {
  APARTMENT: { label: 'Căn hộ', tone: 'info' },
  PENTHOUSE: { label: 'Penthouse', tone: 'primary' },
  VILLA: { label: 'Villa', tone: 'success' },
  DUPLEX: { label: 'Duplex', tone: 'info' },
  SHOPHOUSE: { label: 'Shophouse', tone: 'warning' },
  PREMISES: { label: 'Mặt bằng', tone: 'neutral' },
  OFFICE: { label: 'Văn phòng', tone: 'neutral' },
}

export const OWNERSHIP_TYPE: Record<OwnershipType, Chip> = {
  OWN: { label: 'Sở hữu', tone: 'primary' },
  RENT: { label: 'Cho thuê', tone: 'warning' },
}

export const USAGE_STATUS: Record<UsageStatus, Chip> = {
  OCCUPIED: { label: 'Đang ở', tone: 'success' },
  VACANT: { label: 'Trống', tone: 'neutral' },
  RENOVATING: { label: 'Đang sửa chữa', tone: 'warning' },
}

export const APARTMENT_STATUS: Record<'ACTIVE' | 'INACTIVE', Chip> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Không hoạt động', tone: 'neutral' },
}
