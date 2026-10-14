import type { IconName } from '@/components/ui'
import type { Tone } from '@/theme'
import type {
  BookingStatus,
  DeclarationStatus,
  MeterType,
  NotificationType,
  Relationship,
  ResidenceStatus,
  ResidentRole,
  ServiceOrderStatus,
  SosStatus,
  SosType,
  TicketPriority,
  TicketStatus,
  Visibility,
} from '@/lib/types'

export interface Chip {
  label: string
  tone: Tone
}

/** Nhãn khớp web BQL (frontend/src/features/*\/constants.ts). */
export const TICKET_STATUS: Record<TicketStatus, Chip> = {
  NEW: { label: 'Mới', tone: 'info' },
  RECEIVED: { label: 'Đã tiếp nhận', tone: 'primary' },
  IN_PROGRESS: { label: 'Đang xử lý', tone: 'warning' },
  WAITING: { label: 'Chờ phản hồi', tone: 'neutral' },
  DONE: { label: 'Hoàn thành', tone: 'success' },
  CLOSED: { label: 'Đóng', tone: 'neutral' },
  CANCELLED: { label: 'Huỷ', tone: 'danger' },
}

/** Nhãn nút chuyển trạng thái (động từ). */
export const STATUS_ACTION: Record<TicketStatus, string> = {
  NEW: 'Mới',
  RECEIVED: 'Tiếp nhận',
  IN_PROGRESS: 'Bắt đầu xử lý',
  WAITING: 'Chờ phản hồi',
  DONE: 'Hoàn thành',
  CLOSED: 'Đóng',
  CANCELLED: 'Huỷ yêu cầu',
}

export const TICKET_PRIORITY: Record<TicketPriority, Chip> = {
  LOW: { label: 'Thấp', tone: 'neutral' },
  MEDIUM: { label: 'Trung bình', tone: 'info' },
  HIGH: { label: 'Cao', tone: 'warning' },
  URGENT: { label: 'Khẩn cấp', tone: 'danger' },
}

export const VISIBILITY: Record<Visibility, string> = {
  INTERNAL: 'Nội bộ',
  PUBLIC: 'Công khai (cư dân thấy)',
}

export const SOS_TYPE: Record<SosType, { label: string; icon: IconName }> = {
  FIRE: { label: 'Cháy nổ', icon: 'fire' },
  MEDICAL: { label: 'Cấp cứu y tế', icon: 'medical-bag' },
  SECURITY: { label: 'An ninh', icon: 'shield-alert' },
  ELEVATOR: { label: 'Kẹt thang máy', icon: 'elevator-passenger' },
  OTHER: { label: 'Khẩn cấp khác', icon: 'alert' },
}

export const SOS_STATUS: Record<SosStatus, Chip> = {
  NEW: { label: 'Mới', tone: 'danger' },
  ACKNOWLEDGED: { label: 'Đã tiếp nhận', tone: 'warning' },
  RESOLVED: { label: 'Đã xử lý', tone: 'success' },
  FALSE_ALARM: { label: 'Báo nhầm', tone: 'neutral' },
}

export const BOOKING_STATUS: Record<BookingStatus, Chip> = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'info' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
}

export const ORDER_STATUS: Record<ServiceOrderStatus, Chip> = {
  PENDING: { label: 'Chờ xác nhận', tone: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'info' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

export const DECLARATION_STATUS: Record<DeclarationStatus, Chip> = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  CANCELLED: { label: 'Cư dân huỷ', tone: 'neutral' },
}

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

export const GENDER: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' }

export const METER_TYPE: Record<MeterType, { label: string; unit: string; icon: IconName }> = {
  ELECTRIC: { label: 'Điện', unit: 'kWh', icon: 'flash' },
  WATER: { label: 'Nước', unit: 'm³', icon: 'water' },
}

export const NOTIFICATION_ICON: Record<NotificationType, IconName> = {
  TICKET_CREATED: 'message-plus-outline',
  TICKET_ASSIGNED: 'account-arrow-right-outline',
  TICKET_STATUS: 'progress-check',
  TICKET_COMMENT: 'comment-text-outline',
  ANNOUNCEMENT: 'bullhorn-outline',
  BOOKING_PENDING: 'calendar-clock',
  PAYMENT_RECEIVED: 'cash-check',
  SOS_ALERT: 'alarm-light-outline',
  DECLARATION: 'clipboard-account-outline',
  SYSTEM: 'information-outline',
}
