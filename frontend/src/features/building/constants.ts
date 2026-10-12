import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type { BuildingType } from '@/features/building/types'
import type { ActiveStatus } from '@/lib/api-types'

export const BUILDING_TYPE: Record<BuildingType, ChipStyle> = {
  BUILDING: { label: 'Tòa nhà', tone: 'info' },
  COMPOUND: { label: 'Khu', tone: 'primary' },
  RENTAL: { label: 'Cho thuê', tone: 'warning' },
}

export const BUILDING_STATUS: Record<ActiveStatus, ChipStyle> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Không hoạt động', tone: 'neutral' },
}

const toOptions = <K extends string>(map: Record<K, ChipStyle>): SelectOption[] =>
  (Object.keys(map) as K[]).map((value) => ({ value, label: map[value].label }))

export const BUILDING_TYPE_OPTIONS = toOptions(BUILDING_TYPE)
export const BUILDING_STATUS_OPTIONS = toOptions(BUILDING_STATUS)

/** 34 đơn vị hành chính cấp tỉnh (sau sắp xếp năm 2025). Ô nhập vẫn cho gõ tự do. */
export const VN_PROVINCES = [
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Hải Phòng',
  'Đà Nẵng',
  'Cần Thơ',
  'Huế',
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Đắk Lắk',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Tĩnh',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'Tuyên Quang',
  'Vĩnh Long',
]
