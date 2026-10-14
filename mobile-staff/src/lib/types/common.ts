/** Kiểu dùng chung nhiều module. */

export type ActiveStatus = 'ACTIVE' | 'INACTIVE'

export interface TokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  mustChangePassword: boolean
  /** Chỉ có khi gửi header X-Client-Type: mobile. */
  refreshToken?: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface Me {
  id: number
  username: string
  email: string
  phone?: string
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED'
  mustChangePassword: boolean
  lastLoginAt?: string
  profile: { fullName: string; avatarUrl?: string; jobTitle?: string; department?: string }
  roles: { id: number; code: string; name: string }[]
  permissions: string[]
  /** Rỗng khi allBuildings = true. */
  buildingIds: number[]
  allBuildings: boolean
}

// ------------------------------------------------------------ Bảng điều khiển

export interface Dashboard {
  month: string
  buildingCount: number
  apartmentCount: number
  occupiedApartmentCount: number
  residentCount: number
  openTickets: number
  overdueTickets: number
  ticketsCreatedInMonth: number
  ticketsResolvedInMonth: number
  amenityBookingsToday?: number
  amenityBookingsInMonth?: number
  feeDebt?: number
  feeCollectionRate?: number
  feePeriod?: string
  activeAccessCards: number
  openTicketsByStatus: { key: string; name: string; count: number }[]
}

// ------------------------------------------------------------ Thông báo

export type NotificationType =
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_STATUS'
  | 'TICKET_COMMENT'
  | 'ANNOUNCEMENT'
  | 'BOOKING_PENDING'
  | 'PAYMENT_RECEIVED'
  | 'SOS_ALERT'
  | 'DECLARATION'
  | 'SYSTEM'

export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  body?: string
  link?: string
  read: boolean
  createdAt: string
}

export interface UploadedFile {
  id: number
  url: string
}

export interface ImportResult {
  total: number
  succeeded: number
  failed: number
  imported: number
  rows: { rowNumber: number; key?: string; success: boolean; message?: string }[]
}
