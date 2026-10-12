import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type { ApartmentType, OwnershipType, UsageStatus } from '@/features/apartment/types'
import type { ActiveStatus } from '@/lib/api-types'

export const APARTMENT_TYPE: Record<ApartmentType, ChipStyle> = {
  APARTMENT: { label: 'Căn hộ', tone: 'info' },
  PENTHOUSE: { label: 'Penthouse', tone: 'primary' },
  VILLA: { label: 'Villa', tone: 'success' },
  DUPLEX: { label: 'Duplex', tone: 'info' },
  SHOPHOUSE: { label: 'Shophouse', tone: 'warning' },
  PREMISES: { label: 'Mặt bằng', tone: 'neutral' },
  OFFICE: { label: 'Văn phòng', tone: 'neutral' },
}

export const OWNERSHIP_TYPE: Record<OwnershipType, ChipStyle> = {
  OWN: { label: 'Sở hữu', tone: 'primary' },
  RENT: { label: 'Cho thuê', tone: 'warning' },
}

export const USAGE_STATUS: Record<UsageStatus, ChipStyle> = {
  OCCUPIED: { label: 'Đang ở', tone: 'success' },
  VACANT: { label: 'Trống', tone: 'neutral' },
  RENOVATING: { label: 'Đang sửa chữa', tone: 'warning' },
}

export const APARTMENT_STATUS: Record<ActiveStatus, ChipStyle> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Không hoạt động', tone: 'neutral' },
}

const toOptions = <K extends string>(map: Record<K, ChipStyle>): SelectOption[] =>
  (Object.keys(map) as K[]).map((value) => ({ value, label: map[value].label }))

export const APARTMENT_TYPE_OPTIONS = toOptions(APARTMENT_TYPE)
export const OWNERSHIP_TYPE_OPTIONS = toOptions(OWNERSHIP_TYPE)
export const USAGE_STATUS_OPTIONS = toOptions(USAGE_STATUS)
export const APARTMENT_STATUS_OPTIONS = toOptions(APARTMENT_STATUS)
