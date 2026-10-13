import { http } from '@/lib/api'
import type {
  AccessCard,
  Amenity,
  AppConfig,
  Availability,
  Booking,
  Declaration,
  DocumentItem,
  FeeNoticeDetail,
  FeeNoticeSummary,
  Home,
  InboxItem,
  Me,
  Member,
  PageResponse,
  Payment,
  Quote,
  SosAlert,
  ServiceItem,
  ServiceOrder,
  ServiceQuote,
  SosType,
  SurveyAnswer,
  SurveyDetail,
  SurveyItem,
  TicketCategory,
  TicketDetail,
  TicketSummary,
  TimelineEntry,
  TokenResponse,
  Vehicle,
  VehicleCategory,
  VietQr,
} from '@/lib/types'

const data = <T,>(p: Promise<{ data: T }>) => p.then((r) => r.data)

export interface MemberInput {
  apartmentId: number
  fullName: string
  phone?: string
  email?: string
  gender?: string
  dateOfBirth?: string
  idType?: string
  idNumber?: string
  role: string
  relationship?: string
  moveInDate?: string
  photoFileId?: number
  note?: string
}

export interface VehicleInput {
  apartmentId: number
  categoryId: number
  vehicleName: string
  plateNumber?: string
  vehicleDescription?: string
  note?: string
}

export interface ServiceOrderInput {
  serviceId: number
  apartmentId: number
  quantity: number
  scheduledAt?: string
  voucherCode?: string
  note?: string
}

export interface BookingInput {
  amenityId: number
  apartmentId: number
  bookingDate: string
  startTime: string
  endTime: string
  peopleCount: number
  voucherCode?: string
  note?: string
}

/** Gọi API app cư dân (/api/v1/resident/**). */
export const api = {
  appConfig: () => data(http.get<AppConfig>('/app-config')),
  login: (phone: string, password: string, deviceName?: string) =>
    data(http.post<TokenResponse>('/auth/login', { phone, password, deviceName })),
  logout: (refreshToken: string | null, pushToken?: string | null) =>
    http.post('/auth/logout', { refreshToken, pushToken }),
  changePassword: (currentPassword: string, newPassword: string) =>
    data(http.post<TokenResponse>('/auth/change-password', { currentPassword, newPassword })),
  me: () => data(http.get<Me>('/me')),
  deleteAccount: (password: string) => http.post('/me/delete-account', { password }),
  home: (apartmentId: number) => data(http.get<Home>('/home', { params: { apartmentId } })),
  registerPushToken: (token: string, platform: 'IOS' | 'ANDROID' | 'WEB') =>
    http.post('/push-tokens', { token, platform }),

  inbox: (page = 0) => data(http.get<PageResponse<InboxItem>>('/inbox', { params: { page, size: 20 } })),
  unreadCount: () => data(http.get<{ count: number }>('/inbox/unread-count')),
  markRead: (id: number) => data(http.post<InboxItem>(`/inbox/${id}/read`)),
  markAllRead: () => http.post('/inbox/read-all'),

  feeNotices: (apartmentId: number, page = 0) =>
    data(http.get<PageResponse<FeeNoticeSummary>>('/fee-notices', { params: { apartmentId, page, size: 20 } })),
  feeNotice: (id: number) => data(http.get<FeeNoticeDetail>(`/fee-notices/${id}`)),
  vietQr: (id: number) => data(http.get<VietQr>(`/fee-notices/${id}/vietqr`)),
  payments: (apartmentId: number) =>
    data(http.get<PageResponse<Payment>>('/payments', { params: { apartmentId, size: 50 } })),

  ticketCategories: () => data(http.get<TicketCategory[]>('/ticket-categories')),
  tickets: (apartmentId: number, page = 0) =>
    data(http.get<PageResponse<TicketSummary>>('/tickets', { params: { apartmentId, page, size: 20, sort: 'createdAt,desc' } })),
  ticket: (id: number) => data(http.get<TicketDetail>(`/tickets/${id}`)),
  timeline: (id: number) => data(http.get<TimelineEntry[]>(`/tickets/${id}/timeline`)),
  createTicket: (body: { apartmentId: number; categoryId: number; title: string; description?: string; fileIds: number[] }) =>
    data(http.post<TicketDetail>('/tickets', body)),
  comment: (id: number, content: string) => data(http.post<TimelineEntry>(`/tickets/${id}/comments`, { content })),
  rate: (id: number, rating: number, comment?: string) =>
    data(http.post<TicketDetail>(`/tickets/${id}/rating`, { rating, comment })),
  uploadPhoto: (uri: string, name: string, mimeType: string) => {
    const form = new FormData()
    // React Native nhận object { uri, name, type }; bản web cần Blob (xử lý ở components/PhotoPicker).
    form.append('file', { uri, name, type: mimeType } as unknown as Blob)
    form.append('purpose', 'TICKET_ATTACHMENT')
    return data(http.post<{ id: number; name: string }>('/files', form, { headers: { 'Content-Type': 'multipart/form-data' } }))
  },
  uploadBlob: (blob: Blob, name: string) => {
    const form = new FormData()
    form.append('file', blob, name)
    form.append('purpose', 'TICKET_ATTACHMENT')
    return data(http.post<{ id: number; name: string }>('/files', form))
  },

  amenities: (apartmentId: number) => data(http.get<Amenity[]>('/amenities', { params: { apartmentId } })),
  amenity: (id: number, apartmentId: number) => data(http.get<Amenity>(`/amenities/${id}`, { params: { apartmentId } })),
  availability: (id: number, apartmentId: number, from: string, days = 7) =>
    data(http.get<Availability>(`/amenities/${id}/availability`, { params: { apartmentId, from, days } })),
  quote: (body: BookingInput) => data(http.post<Quote>('/bookings/quote', body)),
  book: (body: BookingInput) => data(http.post<Booking>('/bookings', body)),
  bookings: (apartmentId: number) =>
    data(http.get<PageResponse<Booking>>('/bookings', { params: { apartmentId, size: 50, sort: 'bookingDate,desc' } })),
  booking: (id: number) => data(http.get<Booking>(`/bookings/${id}`)),
  cancelBooking: (id: number, reason: string, version: number) =>
    data(http.post<Booking>(`/bookings/${id}/cancel`, { reason, version })),

  sos: (apartmentId: number, alertType: SosType, description?: string) =>
    data(http.post<SosAlert>('/sos', { apartmentId, alertType, description })),

  members: (apartmentId: number) => data(http.get<Member[]>(`/apartments/${apartmentId}/members`)),
  vehicles: (apartmentId: number) => data(http.get<Vehicle[]>(`/apartments/${apartmentId}/vehicles`)),
  accessCards: (apartmentId: number) => data(http.get<AccessCard[]>(`/apartments/${apartmentId}/access-cards`)),
  vehicleCategories: (apartmentId: number) =>
    data(http.get<VehicleCategory[]>(`/apartments/${apartmentId}/vehicle-categories`)),
  declarations: (apartmentId: number) => data(http.get<Declaration[]>('/declarations', { params: { apartmentId } })),
  declaration: (id: number) => data(http.get<Declaration>(`/declarations/${id}`)),
  declareMember: (body: MemberInput) => data(http.post<Declaration>('/declarations/members', body)),
  declareVehicle: (body: VehicleInput) => data(http.post<Declaration>('/declarations/vehicles', body)),
  cancelDeclaration: (id: number) => data(http.post<Declaration>(`/declarations/${id}/cancel`)),
  uploadAvatar: (uri: string, name: string, mimeType: string) => {
    const form = new FormData()
    form.append('file', { uri, name, type: mimeType } as unknown as Blob)
    form.append('purpose', 'RESIDENT_AVATAR')
    return data(http.post<{ id: number }>('/files', form, { headers: { 'Content-Type': 'multipart/form-data' } }))
  },
  uploadAvatarBlob: (blob: Blob, name: string) => {
    const form = new FormData()
    form.append('file', blob, name)
    form.append('purpose', 'RESIDENT_AVATAR')
    return data(http.post<{ id: number }>('/files', form))
  },

  documents: (apartmentId: number) =>
    data(http.get<PageResponse<DocumentItem>>('/documents', { params: { apartmentId, size: 50 } })),

  surveys: (apartmentId: number) => data(http.get<SurveyItem[]>('/surveys', { params: { apartmentId } })),
  survey: (id: number, apartmentId: number) => data(http.get<SurveyDetail>(`/surveys/${id}`, { params: { apartmentId } })),
  answerSurvey: (id: number, apartmentId: number, answers: SurveyAnswer[]) =>
    http.post(`/surveys/${id}/responses`, { apartmentId, answers }),

  services: (apartmentId: number) => data(http.get<ServiceItem[]>('/services', { params: { apartmentId } })),
  service: (id: number, apartmentId: number) => data(http.get<ServiceItem>(`/services/${id}`, { params: { apartmentId } })),
  quoteOrder: (body: ServiceOrderInput) => data(http.post<ServiceQuote>('/service-orders/quote', body)),
  order: (body: ServiceOrderInput) => data(http.post<ServiceOrder>('/service-orders', body)),
  orders: (apartmentId: number) =>
    data(http.get<PageResponse<ServiceOrder>>('/service-orders', { params: { apartmentId, size: 50, sort: 'createdAt,desc' } })),
  orderDetail: (id: number) => data(http.get<ServiceOrder>(`/service-orders/${id}`)),
  cancelOrder: (id: number, reason: string, version: number) =>
    data(http.post<ServiceOrder>(`/service-orders/${id}/cancel`, { reason, version })),
}
