import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type {
  AppAccountStatus,
  IdDocumentType,
  Relationship,
  ResidenceStatus,
  ResidentRole,
} from '@/features/resident/types'

export const RESIDENT_ROLE: Record<ResidentRole, ChipStyle> = {
  OWNER: { label: 'Chủ sở hữu', tone: 'primary' },
  TENANT: { label: 'Người thuê', tone: 'warning' },
  FAMILY: { label: 'Thành viên gia đình', tone: 'info' },
  GUEST: { label: 'Khách lưu trú', tone: 'neutral' },
}

export const RELATIONSHIP: Record<Relationship, string> = {
  SPOUSE: 'Vợ/Chồng',
  CHILD: 'Con',
  PARENT: 'Bố/Mẹ',
  OTHER: 'Khác',
}

export const RESIDENCE_STATUS: Record<ResidenceStatus, ChipStyle> = {
  LIVING: { label: 'Đang ở', tone: 'success' },
  TEMP_ABSENT: { label: 'Tạm vắng', tone: 'warning' },
  MOVED_OUT: { label: 'Đã chuyển đi', tone: 'neutral' },
}

export const APP_ACCOUNT_STATUS: Record<AppAccountStatus, ChipStyle> = {
  NONE: { label: 'Chưa tạo', tone: 'neutral' },
  ACTIVE: { label: 'Đã kích hoạt', tone: 'success' },
  LOCKED: { label: 'Bị khoá', tone: 'danger' },
}

export const ID_TYPE: Record<IdDocumentType, string> = {
  CCCD: 'CCCD',
  PASSPORT: 'Hộ chiếu',
}

export const GENDER_LABEL: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' }

const toOptions = <K extends string>(map: Record<K, ChipStyle | string>): SelectOption[] =>
  (Object.keys(map) as K[]).map((value) => {
    const v = map[value]
    return { value, label: typeof v === 'string' ? v : v.label }
  })

export const RESIDENT_ROLE_OPTIONS = toOptions(RESIDENT_ROLE)
export const RELATIONSHIP_OPTIONS = toOptions(RELATIONSHIP)
export const RESIDENCE_STATUS_OPTIONS = toOptions(RESIDENCE_STATUS)
/** Khi gán/sửa cư trú chỉ chọn Đang ở / Tạm vắng; Đã chuyển đi đặt qua ngày chuyển đi hoặc "Chuyển đi". */
export const ACTIVE_RESIDENCE_OPTIONS = RESIDENCE_STATUS_OPTIONS.filter((o) => o.value !== 'MOVED_OUT')
export const APP_ACCOUNT_OPTIONS = toOptions(APP_ACCOUNT_STATUS)
export const ID_TYPE_OPTIONS = toOptions(ID_TYPE)
export const TEMP_RESIDENCE_OPTIONS: SelectOption[] = [
  { value: 'true', label: 'Có' },
  { value: 'false', label: 'Chưa' },
]
export const DEFAULT_NATIONALITY = 'Việt Nam'
