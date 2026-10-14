/** Yêu cầu hỗ trợ + danh mục. Khớp frontend/src/features/ticket/types.ts. */
import type { ActiveStatus } from './common'

export type TicketStatus = 'NEW' | 'RECEIVED' | 'IN_PROGRESS' | 'WAITING' | 'DONE' | 'CLOSED' | 'CANCELLED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TicketChannel = 'APP' | 'HOTLINE' | 'DIRECT'
export type Visibility = 'INTERNAL' | 'PUBLIC'
export type EntryType = 'CREATED' | 'STATUS_CHANGE' | 'ASSIGNMENT' | 'COMMENT' | 'RATING'

export interface TicketCategory {
  id: number
  name: string
  description?: string
  responseSlaHours: number
  resolutionSlaHours: number
  defaultAssigneeId?: number
  defaultAssigneeName?: string
  status: ActiveStatus
  ticketCount: number
  createdAt: string
  updatedAt: string
  version: number
}

export interface TicketCategoryOption {
  id: number
  name: string
  responseSlaHours: number
  resolutionSlaHours: number
  defaultAssigneeId?: number
}

export interface TicketCategoryRequest {
  name: string
  description: string | null
  responseSlaHours: number
  resolutionSlaHours: number
  defaultAssigneeId: number | null
  status: ActiveStatus
  version?: number
}

export interface Assignee {
  id: number
  username: string
  fullName: string
  avatarUrl?: string
}

export interface TicketSummary {
  id: number
  buildingId: number
  buildingName: string
  code: string
  title: string
  categoryId: number
  categoryName: string
  apartmentId?: number
  apartmentCode?: string
  residentId?: number
  residentName?: string
  residentPhone?: string
  channel: TicketChannel
  priority: TicketPriority
  assigneeId?: number
  assigneeName?: string
  status: TicketStatus
  responseDueAt: string
  resolutionDueAt: string
  overdue: boolean
  rating?: number
  createdAt: string
  updatedAt: string
  version: number
}

export interface Attachment {
  id: number
  fileId: number
  name: string
  size: number
  contentType: string
  url: string
}

export interface TicketDetail {
  ticket: TicketSummary
  description?: string
  respondedAt?: string
  resolvedAt?: string
  closedAt?: string
  ratingComment?: string
  attachments: Attachment[]
  allowedStatuses: TicketStatus[]
  createdBy?: string
  createdByName?: string
}

export interface TimelineEntry {
  id: number
  type: EntryType
  visibility: Visibility
  content?: string
  fromStatus?: TicketStatus
  toStatus?: TicketStatus
  assigneeId?: number
  assigneeName?: string
  actorUsername?: string
  actorName?: string
  createdAt: string
  attachments: Attachment[]
}

export interface BoardColumn {
  status: TicketStatus
  total: number
  items: TicketSummary[]
}

export interface TicketRequest {
  title: string
  description: string | null
  categoryId: number
  apartmentId: number | null
  residentId: number | null
  channel: TicketChannel
  priority: TicketPriority
  /** Chỉ dùng khi tạo mới; sửa thì backend bỏ qua, phải gọi /assignee riêng. */
  assigneeId: number | null
  fileIds: number[]
  version?: number
}
