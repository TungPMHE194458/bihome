import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type { TicketChannel, TicketPriority, TicketStatus, Visibility } from '@/features/ticket/types'

export const TICKET_STATUS: Record<TicketStatus, ChipStyle> = {
  NEW: { label: 'Mới', tone: 'info' },
  RECEIVED: { label: 'Đã tiếp nhận', tone: 'primary' },
  IN_PROGRESS: { label: 'Đang xử lý', tone: 'warning' },
  WAITING: { label: 'Chờ phản hồi', tone: 'neutral' },
  DONE: { label: 'Hoàn thành', tone: 'success' },
  CLOSED: { label: 'Đóng', tone: 'neutral' },
  CANCELLED: { label: 'Huỷ', tone: 'danger' },
}

export const STATUS_ORDER: TicketStatus[] = ['NEW', 'RECEIVED', 'IN_PROGRESS', 'WAITING', 'DONE', 'CLOSED', 'CANCELLED']

/** Bản sao luồng chuyển trạng thái của backend (TicketStatus) — chỉ để gợi ý khi kéo thả; backend vẫn kiểm tra. */
export const NEXT_STATUSES: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['RECEIVED', 'IN_PROGRESS', 'CANCELLED'],
  RECEIVED: ['IN_PROGRESS', 'WAITING', 'CANCELLED'],
  IN_PROGRESS: ['WAITING', 'DONE', 'CANCELLED'],
  WAITING: ['IN_PROGRESS', 'DONE', 'CANCELLED'],
  DONE: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: [],
  CANCELLED: [],
}

export const isFinal = (s: TicketStatus) => s === 'CLOSED' || s === 'CANCELLED'

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

export const TICKET_PRIORITY: Record<TicketPriority, ChipStyle> = {
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
  PUBLIC: 'Công khai',
}

const options = <K extends string>(keys: K[], label: (k: K) => string): SelectOption[] =>
  keys.map((value) => ({ value, label: label(value) }))

export const STATUS_OPTIONS = options(STATUS_ORDER, (k) => TICKET_STATUS[k].label)
export const PRIORITY_OPTIONS = options(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as TicketPriority[], (k) => TICKET_PRIORITY[k].label)
export const CHANNEL_OPTIONS = options(['HOTLINE', 'DIRECT', 'APP'] as TicketChannel[], (k) => TICKET_CHANNEL[k])
export const CATEGORY_STATUS_OPTIONS: SelectOption[] = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động' },
]

/** "26 giờ" / "2 ngày" / "1 ngày 4 giờ" cho SLA. */
export function formatHours(hours: number): string {
  if (hours < 24) return `${hours} giờ`
  const days = Math.floor(hours / 24)
  const rest = hours % 24
  return rest ? `${days} ngày ${rest} giờ` : `${days} ngày`
}
