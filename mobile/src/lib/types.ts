/** Kiểu dữ liệu API app cư dân (/api/v1/resident/**), khớp DTO backend. */

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
  mustChangePassword: boolean
}

export interface AppConfig {
  minVersion: string
  companyName?: string
  hotline?: string
  email?: string
}

export type ResidentRole = 'OWNER' | 'TENANT' | 'FAMILY' | 'GUEST'

export interface Apartment {
  id: number
  code: string
  name: string
  buildingId: number
  buildingName: string
  role: ResidentRole
  householdHead: boolean
}

export interface Me {
  residentId: number
  code: string
  fullName: string
  phone: string
  email?: string
  avatarUrl?: string
  buildingName?: string
  mustChangePassword: boolean
  apartments: Apartment[]
}

export interface Home {
  apartmentId: number
  outstanding: number
  unpaidNotices: number
  nearestDueDate?: string
  openTickets: number
  upcomingBookings: number
  unreadInbox: number
}

export type InboxType =
  | 'FEE_NOTICE'
  | 'PAYMENT'
  | 'TICKET'
  | 'BOOKING'
  | 'ANNOUNCEMENT'
  | 'REMINDER'
  | 'SOS'
  | 'SYSTEM'
  | 'DECLARATION'
  | 'SURVEY'
  | 'SERVICE_ORDER'

export interface InboxItem {
  id: number
  type: InboxType
  title: string
  body?: string
  link?: string
  read: boolean
  createdAt: string
}

// ------------------------------------------------------------ Phí

export type FeeStatus = 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED'
export type ItemType = 'MANAGEMENT' | 'ELECTRIC' | 'WATER' | 'PARKING' | 'OTHER' | 'VAT' | 'SERVICE' | 'PREVIOUS_DEBT' | 'DISCOUNT'
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'VIETQR'

export interface FeeNoticeSummary {
  id: number
  code: string
  period: string
  apartmentId: number
  apartmentCode: string
  holderName?: string
  totalAmount: number
  paidAmount: number
  outstanding: number
  dueDate: string
  status: FeeStatus
  carriedToId?: number
  carriedToCode?: string
  issuedAt?: string
}

export interface FeeNoticeItem {
  type: ItemType
  description: string
  quantity?: number
  unitPrice?: number
  amount: number
}

export interface FeeNoticePayment {
  id: number
  code: string
  amount: number
  method: PaymentMethod
  paidAt: string
  status: 'ACTIVE' | 'CANCELLED'
}

export interface FeeNoticeDetail {
  summary: FeeNoticeSummary
  vatPercent: number
  items: FeeNoticeItem[]
  note?: string
  payments: FeeNoticePayment[]
  vietQrAvailable: boolean
  transferContent?: string
}

export interface VietQr {
  payload: string
  bankBin: string
  accountNo: string
  accountName: string
  amount: number
  content: string
}

export interface Payment {
  id: number
  code: string
  feeNoticeId: number
  feeNoticeCode: string
  period: string
  amount: number
  method: PaymentMethod
  paidAt: string
  status: 'ACTIVE' | 'CANCELLED'
}

// ------------------------------------------------------------ Yêu cầu

export type TicketStatus = 'NEW' | 'RECEIVED' | 'IN_PROGRESS' | 'WAITING' | 'DONE' | 'CLOSED' | 'CANCELLED'

export interface TicketCategory {
  id: number
  name: string
}

export interface TicketSummary {
  id: number
  code: string
  title: string
  categoryName: string
  apartmentCode?: string
  status: TicketStatus
  assigneeName?: string
  rating?: number
  createdAt: string
  updatedAt: string
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
}

export interface TimelineEntry {
  id: number
  type: 'CREATED' | 'STATUS_CHANGE' | 'ASSIGNMENT' | 'COMMENT' | 'RATING'
  content?: string
  fromStatus?: TicketStatus
  toStatus?: TicketStatus
  actorUsername?: string
  actorName?: string
  createdAt: string
  attachments: Attachment[]
}

// ------------------------------------------------------------ Tiện ích

export interface Amenity {
  id: number
  code: string
  name: string
  location?: string
  capacity: number
  openTime: string
  closeTime: string
  rules?: string
  requiresApproval: boolean
  coverImageUrl?: string
  images: { fileId: number; url: string; cover: boolean }[]
  slotCount: number
}

export interface SlotAvailability {
  startTime: string
  endTime: string
  capacity: number
  booked: number
  remaining: number
  price?: number
  priceUnit?: 'PER_BOOKING' | 'PER_PERSON'
  past: boolean
}

export interface DayAvailability {
  date: string
  closedReason?: string
  slots: SlotAvailability[]
}

export interface Availability {
  amenityId: number
  amenityName: string
  capacity: number
  requiresApproval: boolean
  maxAdvanceDays: number
  maxBookingsPerWeek?: number
  freeCancelHours: number
  days: DayAvailability[]
}

export interface Quote {
  fee: number
  discount: number
  total: number
  voucherCode?: string
  requiresApproval: boolean
  remaining: number
}

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED'

export interface Booking {
  id: number
  code: string
  amenityId: number
  amenityName: string
  apartmentCode: string
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
  freeCancelUntil?: string
  createdAt: string
  version: number
}

// ------------------------------------------------------------ SOS

export type SosType = 'FIRE' | 'MEDICAL' | 'SECURITY' | 'ELEVATOR' | 'OTHER'

export interface SosAlert {
  id: number
  code: string
  alertType: SosType
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM'
  createdAt: string
}

// ------------------------------------------------------------ Căn hộ của tôi

export type Relationship = 'SPOUSE' | 'CHILD' | 'PARENT' | 'OTHER'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'
export type IdDocumentType = 'CCCD' | 'PASSPORT'

export interface Member {
  linkId: number
  residentId: number
  code: string
  fullName: string
  phone?: string
  avatarUrl?: string
  role: ResidentRole
  relationship?: Relationship
  householdHead: boolean
  moveInDate: string
  residenceStatus: 'LIVING' | 'TEMP_ABSENT' | 'MOVED_OUT'
}

export interface Vehicle {
  id: number
  categoryName: string
  name: string
  plateNumber?: string
  accessCardNo?: string
  description?: string
  entryDate: string
}

export type CardStatus = 'IN_STOCK' | 'IN_USE' | 'LOCKED' | 'LOST' | 'REVOKED'
export type CardType = 'ELEVATOR' | 'DOOR' | 'PARKING' | 'MULTI'

export interface AccessCard {
  id: number
  cardNo: string
  cardType: CardType
  residentName?: string
  plateNumber?: string
  issuedDate?: string
  expiryDate?: string
  expired: boolean
  status: CardStatus
}

export interface VehicleCategory {
  id: number
  name: string
  unit?: string
}

export type DeclarationType = 'MEMBER' | 'VEHICLE'
export type DeclarationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

export interface Declaration {
  id: number
  code: string
  type: DeclarationType
  status: DeclarationStatus
  apartmentId: number
  apartmentCode: string
  submittedById: number
  submittedByName?: string
  fullName?: string
  phone?: string
  email?: string
  gender?: Gender
  dateOfBirth?: string
  idType?: IdDocumentType
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
  rejectReason?: string
  createdAt: string
}

export interface DocumentItem {
  id: number
  code: string
  name: string
  description?: string
  categoryName: string
  categoryColor?: string
  fileName: string
  fileSize: number
  contentType: string
  updatedAt: string
}

// ------------------------------------------------------------ Khảo sát

export type QuestionType = 'SINGLE' | 'MULTIPLE' | 'TEXT' | 'RATING'

export interface SurveyItem {
  id: number
  title: string
  description?: string
  startAt: string
  endAt: string
  anonymous: boolean
  questionCount: number
  answered: boolean
}

export interface SurveyQuestion {
  id: number
  type: QuestionType
  content: string
  required: boolean
  options: { id: number; label: string }[]
}

export interface SurveyDetail extends Omit<SurveyItem, 'questionCount'> {
  accepting: boolean
  questions: SurveyQuestion[]
}

export interface SurveyAnswer {
  questionId: number
  optionIds?: number[]
  text?: string
  rating?: number
}

// ------------------------------------------------------------ Dịch vụ

export interface ServiceItem {
  id: number
  code: string
  name: string
  serviceTypeName: string
  unitPrice: number
  unit: string
  description?: string
  coverImageUrl?: string
}

export type ServiceOrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

export interface ServiceOrder {
  id: number
  code: string
  serviceId: number
  serviceName: string
  apartmentCode: string
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
  version: number
}

export interface ServiceQuote {
  unitPrice: number
  unit: string
  amount: number
  discount: number
  total: number
}
