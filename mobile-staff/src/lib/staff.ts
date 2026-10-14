import type { AxiosRequestConfig } from 'axios'
import { Platform } from 'react-native'
import { http } from '@/lib/api'
import type {
  ApartmentMember,
  ApartmentSummary,
  AppNotification,
  AssetItem,
  Assignee,
  Booking,
  BuildingOption,
  Dashboard,
  Declaration,
  Me,
  MeterSheet,
  MeterType,
  PageResponse,
  ResidentSummary,
  ServiceOrder,
  SheetEntry,
  SosActive,
  SosAlert,
  TicketDetail,
  TicketStatus,
  TicketSummary,
  TimelineEntry,
  TokenResponse,
  UploadedFile,
  Visibility,
} from '@/lib/types'

type Params = Record<string, string | number | boolean | undefined | null>

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)
/** Bỏ tham số rỗng để không gửi "keyword=" lên backend. */
const clean = (p: Params) => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== ''))
/** API dùng chung mọi tòa (không gửi X-Building-Id). */
const noBuilding: AxiosRequestConfig = { headers: { 'X-Building-Id': null } as unknown as AxiosRequestConfig['headers'] }

export const api = {
  // ---------------------------------------------------------------- Tài khoản
  login: (username: string, password: string) =>
    data(http.post<TokenResponse>('/auth/login', { username, password, rememberMe: true })),
  logout: (refreshToken: string | null) =>
    http.post('/auth/logout', null, { headers: refreshToken ? { 'X-Refresh-Token': refreshToken } : {} }),
  changePassword: (currentPassword: string, newPassword: string, refreshToken: string | null) =>
    data(http.post<TokenResponse>('/auth/change-password', { currentPassword, newPassword, confirmPassword: newPassword }, {
      headers: refreshToken ? { 'X-Refresh-Token': refreshToken } : {},
    })),
  me: () => data(http.get<Me>('/auth/me', noBuilding)),
  buildings: () => data(http.get<BuildingOption[]>('/buildings/options', noBuilding)),
  registerPushToken: (token: string, platform: 'IOS' | 'ANDROID') =>
    http.post('/notifications/push-tokens', { token, platform }, noBuilding),
  unregisterPushToken: (token: string) => http.delete(`/notifications/push-tokens/${encodeURIComponent(token)}`, noBuilding),

  // ---------------------------------------------------------------- Tổng quan + thông báo
  dashboard: (month: string) => data(http.get<Dashboard>('/dashboard', { params: { month } })),
  notifications: (page = 0) =>
    data(http.get<PageResponse<AppNotification>>('/notifications', { params: { page, size: 20 }, ...noBuilding })),
  unreadCount: () => data(http.get<{ count: number }>('/notifications/unread-count', noBuilding)),
  markRead: (id: number) => http.post(`/notifications/${id}/read`, null, noBuilding),
  markAllRead: () => http.post('/notifications/read-all', null, noBuilding),

  // ---------------------------------------------------------------- Yêu cầu hỗ trợ
  tickets: (p: Params) =>
    data(http.get<PageResponse<TicketSummary>>('/tickets', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  ticket: (id: number) => data(http.get<TicketDetail>(`/tickets/${id}`)),
  timeline: (id: number) => data(http.get<TimelineEntry[]>(`/tickets/${id}/timeline`)),
  assignees: (buildingId: number) => data(http.get<Assignee[]>('/tickets/assignees', { params: { buildingId } })),
  changeStatus: (id: number, body: { status: TicketStatus; note: string | null; visibility: Visibility; version: number }) =>
    data(http.post<TicketDetail>(`/tickets/${id}/status`, body)),
  assign: (id: number, assigneeId: number | null, version: number) =>
    data(http.put<TicketDetail>(`/tickets/${id}/assignee`, { assigneeId, version })),
  comment: (id: number, content: string, visibility: Visibility, fileIds: number[]) =>
    data(http.post<TimelineEntry>(`/tickets/${id}/comments`, { content, visibility, fileIds })),

  // ---------------------------------------------------------------- SOS
  sosActive: () => data(http.get<SosActive>('/sos-alerts/active')),
  sosList: (p: Params) =>
    data(http.get<PageResponse<SosAlert>>('/sos-alerts', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  sos: (id: number) => data(http.get<SosAlert>(`/sos-alerts/${id}`)),
  acknowledgeSos: (id: number, version: number) => data(http.post<SosAlert>(`/sos-alerts/${id}/acknowledge`, { version })),
  resolveSos: (id: number, status: 'RESOLVED' | 'FALSE_ALARM', note: string, version: number) =>
    data(http.post<SosAlert>(`/sos-alerts/${id}/resolve`, { status, note, version })),

  // ---------------------------------------------------------------- Duyệt
  bookings: (p: Params) =>
    data(http.get<PageResponse<Booking>>('/amenity-bookings', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  booking: (id: number) => data(http.get<Booking>(`/amenity-bookings/${id}`)),
  approveBooking: (id: number, version: number) => data(http.post<Booking>(`/amenity-bookings/${id}/approve`, { version })),
  rejectBooking: (id: number, reason: string, version: number) =>
    data(http.post<Booking>(`/amenity-bookings/${id}/reject`, { reason, version })),

  declarations: (p: Params) =>
    data(http.get<PageResponse<Declaration>>('/declarations', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  declaration: (id: number) => data(http.get<Declaration>(`/declarations/${id}`)),
  approveDeclaration: (id: number, body: { phone?: string | null; version: number }) =>
    data(http.post<Declaration>(`/declarations/${id}/approve`, body)),
  rejectDeclaration: (id: number, reason: string, version: number) =>
    data(http.post<Declaration>(`/declarations/${id}/reject`, { reason, version })),

  orders: (p: Params) =>
    data(http.get<PageResponse<ServiceOrder>>('/service-orders', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  order: (id: number) => data(http.get<ServiceOrder>(`/service-orders/${id}`)),
  confirmOrder: (id: number, version: number) => data(http.post<ServiceOrder>(`/service-orders/${id}/confirm`, { version })),
  completeOrder: (id: number, version: number) => data(http.post<ServiceOrder>(`/service-orders/${id}/complete`, { version })),
  cancelOrder: (id: number, reason: string, version: number) =>
    data(http.post<ServiceOrder>(`/service-orders/${id}/cancel`, { reason, version })),

  // ---------------------------------------------------------------- Số liệu điện nước
  meterSheet: (period: string, meterType: MeterType, floor?: string) =>
    data(http.get<MeterSheet>('/meter-readings/sheet', { params: clean({ period, meterType, floor }) })),
  saveMeterSheet: (period: string, meterType: MeterType, rows: SheetEntry[]) =>
    data(http.put<{ created: number; updated: number; unchanged: number }>('/meter-readings/sheet', { period, meterType, rows })),

  // ---------------------------------------------------------------- Tra cứu
  residents: (keyword: string) =>
    data(http.get<PageResponse<ResidentSummary>>('/residents', { params: clean({ keyword, size: 20, sort: 'fullName,asc' }) })),
  apartments: (keyword: string) =>
    data(http.get<PageResponse<ApartmentSummary>>('/apartments', { params: clean({ keyword, size: 20, sort: 'code,asc' }) })),
  apartment: (id: number) => data(http.get<ApartmentSummary>(`/apartments/${id}`)),
  apartmentMembers: (id: number) => data(http.get<ApartmentMember[]>(`/residents/apartment/${id}`)),
  vehicles: (p: Params) =>
    data(http.get<PageResponse<AssetItem>>('/asset-items', { params: clean({ size: 20, sort: 'plateNumber,asc', ...p }) })),

  // ---------------------------------------------------------------- Tệp
  uploadPhoto: (uri: string, name: string, type: string, purpose: string) => {
    const form = new FormData()
    form.append('file', { uri, name, type } as unknown as Blob)
    form.append('purpose', purpose)
    return data(http.post<UploadedFile>('/files', form, { headers: { 'Content-Type': 'multipart/form-data' } }))
  },
  uploadBlob: (file: Blob, name: string, purpose: string) => {
    const form = new FormData()
    form.append('file', file, name)
    form.append('purpose', purpose)
    return data(http.post<UploadedFile>('/files', form))
  },
}

export const isWeb = Platform.OS === 'web'
