/** Kiểu dữ liệu của API Ban quản lý (khớp frontend/src/features/*\/types.ts). Trường null thường bị backend bỏ khỏi JSON. */

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

export interface BuildingOption {
  id: number
  code: string
  name: string
  address?: string
  status: 'ACTIVE' | 'INACTIVE'
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

// ------------------------------------------------------------ Yêu cầu hỗ trợ

export type TicketStatus = 'NEW' | 'RECEIVED' | 'IN_PROGRESS' | 'WAITING' | 'DONE' | 'CLOSED' | 'CANCELLED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type Visibility = 'INTERNAL' | 'PUBLIC'

export interface TicketSummary {
  id: number
  buildingId: number
  buildingName: string
  code: string
  title: string
  categoryName: string
  apartmentId?: number
  apartmentCode?: string
  residentId?: number
  residentName?: string
  residentPhone?: string
  channel: 'APP' | 'HOTLINE' | 'DIRECT'
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
  ratingComment?: string
  attachments: Attachment[]
  allowedStatuses: TicketStatus[]
  createdByName?: string
}

export interface TimelineEntry {
  id: number
  type: 'CREATED' | 'STATUS_CHANGE' | 'ASSIGNMENT' | 'COMMENT' | 'RATING'
  visibility: Visibility
  content?: string
  fromStatus?: TicketStatus
  toStatus?: TicketStatus
  assigneeName?: string
  actorUsername?: string
  actorName?: string
  createdAt: string
  attachments: Attachment[]
}

export interface Assignee {
  id: number
  username: string
  fullName: string
}

// ------------------------------------------------------------ SOS

export type SosType = 'FIRE' | 'MEDICAL' | 'SECURITY' | 'ELEVATOR' | 'OTHER'
export type SosStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM'

export interface SosAlert {
  id: number
  buildingId: number
  buildingName: string
  code: string
  alertType: SosType
  source: 'MANUAL' | 'APP'
  apartmentId?: number
  apartmentCode?: string
  reporterName?: string
  reporterPhone?: string
  location?: string
  description?: string
  status: SosStatus
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolvedAt?: string
  resolvedBy?: string
  resolutionNote?: string
  createdAt: string
  version: number
}

export interface SosActive {
  count: number
  newCount: number
  latestId?: number
  latest: SosAlert[]
}

// ------------------------------------------------------------ Việc chờ duyệt

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED'

export interface Booking {
  id: number
  buildingName: string
  code: string
  amenityName: string
  apartmentId: number
  apartmentCode: string
  residentName?: string
  bookingDate: string
  startTime: string
  endTime: string
  peopleCount: number
  fee: number
  discount: number
  total: number
  voucherCode?: string
  status: BookingStatus
  note?: string
  rejectReason?: string
  cancelReason?: string
  decidedAt?: string
  decidedBy?: string
  createdAt: string
  createdBy?: string
  version: number
}

export type ServiceOrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

export interface ServiceOrder {
  id: number
  buildingName: string
  code: string
  serviceName: string
  apartmentId: number
  apartmentCode: string
  residentName?: string
  quantity: number
  unitPrice: number
  unit: string
  amount: number
  voucherCode?: string
  discount: number
  total: number
  scheduledAt?: string
  status: ServiceOrderStatus
  note?: string
  cancelReason?: string
  completedAt?: string
  createdAt: string
  createdBy?: string
  version: number
}

export type DeclarationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface Declaration {
  id: number
  code: string
  type: 'MEMBER' | 'VEHICLE'
  status: DeclarationStatus
  apartmentId: number
  apartmentCode: string
  submittedByName?: string
  submittedByPhone?: string
  fullName?: string
  phone?: string
  email?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  dateOfBirth?: string
  idType?: 'CCCD' | 'PASSPORT'
  idNumber?: string
  role?: ResidentRole
  relationship?: Relationship
  moveInDate?: string
  photoUrl?: string
  categoryName?: string
  vehicleName?: string
  plateNumber?: string
  vehicleDescription?: string
  note?: string
  reviewedAt?: string
  reviewedBy?: string
  rejectReason?: string
  createdAt: string
  version: number
}

// ------------------------------------------------------------ Số liệu điện nước

export type MeterType = 'ELECTRIC' | 'WATER'

export interface SheetRow {
  apartmentId: number
  apartmentCode: string
  floorNo: string
  oldIndex?: number
  previousPeriod?: string
  averageConsumption?: number
  readingId?: number
  newIndex?: number
  consumption?: number
  spike: boolean
  locked: boolean
  version?: number
}

export interface MeterSheet {
  period: string
  meterType: MeterType
  floors: string[]
  rows: SheetRow[]
}

export interface SheetEntry {
  apartmentId: number
  oldIndex?: number | null
  newIndex?: number | null
}

// ------------------------------------------------------------ Tra cứu

export type ResidentRole = 'OWNER' | 'TENANT' | 'FAMILY' | 'GUEST'
export type Relationship = 'SPOUSE' | 'CHILD' | 'PARENT' | 'OTHER'
export type ResidenceStatus = 'LIVING' | 'TEMP_ABSENT' | 'MOVED_OUT'

export interface ResidentSummary {
  id: number
  buildingName: string
  code: string
  fullName: string
  phone: string
  email?: string
  avatarUrl?: string
  apartments: {
    id: number
    apartmentId: number
    apartmentCode: string
    role: ResidentRole
    householdHead: boolean
    residenceStatus: ResidenceStatus
  }[]
  residenceStatus: ResidenceStatus
}

export interface ApartmentSummary {
  id: number
  buildingName: string
  code: string
  name: string
  floorNo: string
  area: number
  usageStatus: 'VACANT' | 'OCCUPIED' | 'RENOVATING'
  ownerName?: string
  memberCount: number
  coverImageUrl?: string
}

export interface ApartmentMember {
  linkId: number
  residentId: number
  code: string
  fullName: string
  phone: string
  avatarUrl?: string
  role: ResidentRole
  relationship?: Relationship
  householdHead: boolean
  residenceStatus: ResidenceStatus
}

export interface AssetItem {
  id: number
  buildingName: string
  apartmentId: number
  apartmentCode: string
  categoryName: string
  name: string
  plateNumber?: string
  accessCardNo?: string
  description?: string
  status: 'ACTIVE' | 'INACTIVE'
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
