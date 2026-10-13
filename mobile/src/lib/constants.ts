import type { Tone } from '@/theme'
import type {
  BookingStatus,
  CardStatus,
  CardType,
  DeclarationStatus,
  Gender,
  FeeStatus,
  InboxType,
  PaymentMethod,
  Relationship,
  ResidentRole,
  ServiceOrderStatus,
  SosType,
  TicketStatus,
} from '@/lib/types'

/** Nhãn tiếng Việt (khớp web BQL: frontend/src/features/<module>/constants.ts). */
export interface Chip {
  label: string
  tone: Tone
}

export const FEE_STATUS: Record<FeeStatus, Chip> = {
  DRAFT: { label: 'Nháp', tone: 'neutral' },
  ISSUED: { label: 'Chưa thanh toán', tone: 'info' },
  PARTIAL: { label: 'Thanh toán một phần', tone: 'warning' },
  PAID: { label: 'Đã thanh toán', tone: 'success' },
  OVERDUE: { label: 'Quá hạn', tone: 'danger' },
  CANCELLED: { label: 'Huỷ', tone: 'neutral' },
}

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  VIETQR: 'VietQR',
}

export const TICKET_STATUS: Record<TicketStatus, Chip> = {
  NEW: { label: 'Mới', tone: 'info' },
  RECEIVED: { label: 'Đã tiếp nhận', tone: 'primary' },
  IN_PROGRESS: { label: 'Đang xử lý', tone: 'warning' },
  WAITING: { label: 'Chờ phản hồi', tone: 'neutral' },
  DONE: { label: 'Hoàn thành', tone: 'success' },
  CLOSED: { label: 'Đóng', tone: 'neutral' },
  CANCELLED: { label: 'Huỷ', tone: 'danger' },
}

export const BOOKING_STATUS: Record<BookingStatus, Chip> = {
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'info' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
}

export const SOS_TYPE: Record<SosType, { label: string; icon: string }> = {
  FIRE: { label: 'Cháy / khói', icon: 'fire' },
  MEDICAL: { label: 'Cấp cứu y tế', icon: 'medical-bag' },
  SECURITY: { label: 'An ninh', icon: 'shield-alert' },
  ELEVATOR: { label: 'Kẹt thang máy', icon: 'elevator-passenger' },
  OTHER: { label: 'Khác', icon: 'alert' },
}

export const RESIDENT_ROLE: Record<ResidentRole, string> = {
  OWNER: 'Chủ sở hữu',
  TENANT: 'Người thuê',
  FAMILY: 'Thành viên gia đình',
  GUEST: 'Khách lưu trú',
}

export const INBOX_ICON: Record<InboxType, string> = {
  FEE_NOTICE: 'file-document-outline',
  PAYMENT: 'cash-check',
  TICKET: 'face-agent',
  BOOKING: 'calendar-check',
  ANNOUNCEMENT: 'bullhorn-outline',
  REMINDER: 'bell-ring-outline',
  SOS: 'alarm-light-outline',
  SYSTEM: 'information-outline',
  DECLARATION: 'clipboard-check-outline',
  SURVEY: 'poll',
  SERVICE_ORDER: 'room-service-outline',
}

export const RELATIONSHIP: Record<Relationship, string> = {
  SPOUSE: 'Vợ/Chồng',
  CHILD: 'Con',
  PARENT: 'Bố/Mẹ',
  OTHER: 'Khác',
}

export const GENDER: Record<Gender, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' }

export const DECLARATION_STATUS: Record<DeclarationStatus, Chip> = {
  PENDING: { label: 'Chờ BQL duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}

export const CARD_TYPE: Record<CardType, string> = {
  ELEVATOR: 'Thang máy',
  DOOR: 'Cửa ra vào',
  PARKING: 'Gửi xe',
  MULTI: 'Đa năng',
}

export const CARD_STATUS: Record<CardStatus, Chip> = {
  IN_STOCK: { label: 'Trong kho', tone: 'neutral' },
  IN_USE: { label: 'Đang dùng', tone: 'success' },
  LOCKED: { label: 'Đang khoá', tone: 'warning' },
  LOST: { label: 'Báo mất', tone: 'danger' },
  REVOKED: { label: 'Đã thu hồi', tone: 'neutral' },
}

export const SERVICE_ORDER_STATUS: Record<ServiceOrderStatus, Chip> = {
  PENDING: { label: 'Chờ xác nhận', tone: 'warning' },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'info' },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
}
