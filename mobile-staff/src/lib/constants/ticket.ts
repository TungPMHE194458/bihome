import type { Chip } from '@/lib/constants/common'
import type { TicketChannel, TicketPriority, TicketStatus, Visibility } from '@/lib/types'

export const TICKET_STATUS: Record<TicketStatus, Chip> = {
  NEW: { label: 'Mới', tone: 'info' },
  RECEIVED: { label: 'Đã tiếp nhận', tone: 'primary' },
  IN_PROGRESS: { label: 'Đang xử lý', tone: 'warning' },
  WAITING: { label: 'Chờ phản hồi', tone: 'neutral' },
  DONE: { label: 'Hoàn thành', tone: 'success' },
  CLOSED: { label: 'Đóng', tone: 'neutral' },
  CANCELLED: { label: 'Huỷ', tone: 'danger' },
}

export const STATUS_ORDER: TicketStatus[] = ['NEW', 'RECEIVED', 'IN_PROGRESS', 'WAITING', 'DONE', 'CLOSED', 'CANCELLED']

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

export const TICKET_CHANNEL: Record<TicketChannel, string> = {
  APP: 'App',
  HOTLINE: 'Hotline',
  DIRECT: 'Trực tiếp',
}

export const VISIBILITY: Record<Visibility, string> = {
  INTERNAL: 'Nội bộ',
  PUBLIC: 'Công khai (cư dân thấy)',
}

export const TICKET_CATEGORY_STATUS: Record<'ACTIVE' | 'INACTIVE', Chip> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' },
}

/** "26 giờ" / "2 ngày" / "1 ngày 4 giờ" cho SLA. */
export function formatHours(hours: number): string {
  if (hours < 24) return `${hours} giờ`
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  return rest ? `${days} ngày ${rest} giờ` : `${days} ngày`
}
