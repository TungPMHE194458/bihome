import type { Chip } from '@/lib/constants/common'
import type { AnnouncementAudience, AnnouncementCategory, AnnouncementStatus } from '@/lib/types'

export const ANNOUNCEMENT_CATEGORY: Record<AnnouncementCategory, Chip> = {
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

export const ANNOUNCEMENT_STATUS: Record<AnnouncementStatus, Chip> = {
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  SCHEDULED: { label: 'Hẹn giờ', tone: 'warning' },
  SENT: { label: 'Đã gửi', tone: 'success' },
}
