/** Thông báo soạn (BQL gửi nhân viên / cư dân). Khớp frontend/src/features/notification/api.ts. */

export type AnnouncementCategory = 'GENERAL' | 'MAINTENANCE' | 'EVENT' | 'FEE' | 'EMERGENCY'
export type AnnouncementAudience = 'STAFF' | 'RESIDENT' | 'ALL'
export type AnnouncementStatus = 'DRAFT' | 'SCHEDULED' | 'SENT'

export interface AnnouncementAttachment {
  fileId: number
  name: string
  size: number
  contentType: string
  url: string
}

export interface Announcement {
  id: number
  buildingId: number
  buildingName: string
  title: string
  content: string
  category: AnnouncementCategory
  audience: AnnouncementAudience
  status: AnnouncementStatus
  scheduledAt?: string
  sentAt?: string
  sentBy?: string
  staffCount: number
  residentCount: number
  attachments: AnnouncementAttachment[]
  createdAt: string
  updatedAt: string
  createdBy?: string
  version: number
}

export interface AnnouncementRequest {
  title: string
  content: string
  category: AnnouncementCategory
  audience: AnnouncementAudience
  /** null = lưu nháp; có giá trị = hẹn giờ gửi (phải sau hiện tại). */
  scheduledAt: string | null
  fileIds: number[]
  version?: number
}
