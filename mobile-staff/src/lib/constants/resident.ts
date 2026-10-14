import type { Chip } from '@/lib/constants/common'
import type { AppAccountStatus, IdDocumentType, Relationship, ResidenceStatus, ResidentRole } from '@/lib/types'

export const RESIDENT_ROLE: Record<ResidentRole, Chip> = {
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

export const RESIDENCE_STATUS: Record<ResidenceStatus, Chip> = {
  LIVING: { label: 'Đang ở', tone: 'success' },
  TEMP_ABSENT: { label: 'Tạm vắng', tone: 'warning' },
  MOVED_OUT: { label: 'Đã chuyển đi', tone: 'neutral' },
}

/** Khi gán/sửa cư trú chỉ chọn Đang ở / Tạm vắng; Đã chuyển đi đặt qua ngày chuyển đi hoặc "Chuyển đi". */
export const ACTIVE_RESIDENCE_STATUSES: ResidenceStatus[] = ['LIVING', 'TEMP_ABSENT']

export const APP_ACCOUNT_STATUS: Record<AppAccountStatus, Chip> = {
  NONE: { label: 'Chưa tạo', tone: 'neutral' },
  ACTIVE: { label: 'Đã kích hoạt', tone: 'success' },
  LOCKED: { label: 'Bị khoá', tone: 'danger' },
}

export const ID_TYPE: Record<IdDocumentType, string> = {
  CCCD: 'CCCD',
  PASSPORT: 'Hộ chiếu',
}

export const GENDER: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' }

export const DEFAULT_NATIONALITY = 'Việt Nam'
