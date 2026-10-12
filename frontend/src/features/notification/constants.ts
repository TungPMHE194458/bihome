import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type { AnnouncementAudience, AnnouncementCategory, AnnouncementStatus } from '@/features/notification/api'

export const ANNOUNCEMENT_CATEGORY: Record<AnnouncementCategory, ChipStyle> = {
  GENERAL: { label: 'Thông báo chung', tone: 'info' },
  MAINTENANCE: { label: 'Bảo trì', tone: 'warning' },
  EVENT: { label: 'Sự kiện', tone: 'success' },
  FEE: { label: 'Phí dịch vụ', tone: 'neutral' },
  EMERGENCY: { label: 'Khẩn cấp', tone: 'danger' },
}

export const ANNOUNCEMENT_AUDIENCE: Record<AnnouncementAudience, string> = {
  ALL: 'Nhân viên và cư dân',
  STAFF: 'Nhân viên tòa',
  RESIDENT: 'Cư dân',
}

export const ANNOUNCEMENT_STATUS: Record<AnnouncementStatus, ChipStyle> = {
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  SCHEDULED: { label: 'Hẹn giờ', tone: 'warning' },
  SENT: { label: 'Đã gửi', tone: 'success' },
}

const options = <K extends string>(map: Record<K, string | ChipStyle>): SelectOption[] =>
  (Object.keys(map) as K[]).map((value) => {
    const v = map[value]
    return { value, label: typeof v === 'string' ? v : v.label }
  })

export const CATEGORY_OPTIONS = options(ANNOUNCEMENT_CATEGORY)
export const AUDIENCE_OPTIONS = options(ANNOUNCEMENT_AUDIENCE)
export const STATUS_OPTIONS = options(ANNOUNCEMENT_STATUS)
