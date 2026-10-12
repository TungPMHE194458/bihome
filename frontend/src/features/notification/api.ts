import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'
import { useAuthStore } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

export type NotificationType =
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_STATUS'
  | 'TICKET_COMMENT'
  | 'ANNOUNCEMENT'
  | 'BOOKING_PENDING'
  | 'PAYMENT_RECEIVED'
  | 'SOS_ALERT'
  | 'SYSTEM'

export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  body?: string
  link?: string
  buildingId?: number
  read: boolean
  createdAt: string
}

export type AnnouncementCategory = 'GENERAL' | 'MAINTENANCE' | 'EVENT' | 'FEE' | 'EMERGENCY'
export type AnnouncementAudience = 'STAFF' | 'RESIDENT' | 'ALL'
export type AnnouncementStatus = 'DRAFT' | 'SCHEDULED' | 'SENT'

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
  attachments: { fileId: number; name: string; size: number; contentType: string; url: string }[]
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
  /** null = lưu nháp. */
  scheduledAt: string | null
  fileIds: number[]
  version?: number
}

export type ListParams = Record<string, string | number>

/** Thông báo của chính người dùng — không phụ thuộc tòa đang chọn. */
const mine = { skipBuildingContext: true }

export const notificationApi = {
  mine: (params: ListParams) => http.get<PageResponse<AppNotification>>('/notifications', { params, ...mine }).then((r) => r.data),
  unreadCount: () => http.get<{ count: number }>('/notifications/unread-count', mine).then((r) => r.data.count),
  markRead: (id: number) => http.post<AppNotification>(`/notifications/${id}/read`, undefined, mine).then((r) => r.data),
  markAllRead: () => http.post<{ count: number }>('/notifications/read-all', undefined, mine).then((r) => r.data),

  announcements: (params: ListParams) => http.get<PageResponse<Announcement>>('/announcements', { params }).then((r) => r.data),
  announcement: (id: number) => http.get<Announcement>(`/announcements/${id}`).then((r) => r.data),
  saveAnnouncement: (id: number | undefined, body: AnnouncementRequest) =>
    (id == null ? http.post<Announcement>('/announcements', body) : http.put<Announcement>(`/announcements/${id}`, body)).then(
      (r) => r.data,
    ),
  sendAnnouncement: (id: number, version: number) =>
    http.post<Announcement>(`/announcements/${id}/send`, { version }).then((r) => r.data),
  removeAnnouncement: (id: number) => http.delete<void>(`/announcements/${id}`),
}

export const notificationKeys = {
  all: ['notifications'] as const,
  mine: (params: ListParams) => [...notificationKeys.all, 'mine', params] as const,
  unread: () => [...notificationKeys.all, 'unread'] as const,
  announcements: (params: ListParams, buildingId: number | null) => ['announcements', 'list', buildingId, params] as const,
  announcement: (id: number) => ['announcements', 'detail', id] as const,
}

/** Badge chuông: hỏi lại mỗi 30 giây khi tab đang mở. */
export function useUnreadCount() {
  const authenticated = useAuthStore((s) => s.status === 'authenticated')
  return useQuery({
    queryKey: notificationKeys.unread(),
    queryFn: notificationApi.unreadCount,
    enabled: authenticated,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })
}

export function useMyNotifications(params: ListParams, enabled: boolean) {
  return useQuery({ queryKey: notificationKeys.mine(params), queryFn: () => notificationApi.mine(params), enabled })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: notificationApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: notificationApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

export function useAnnouncements(params: ListParams) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: notificationKeys.announcements(params, buildingId),
    queryFn: () => notificationApi.announcements(params),
    placeholderData: keepPreviousData,
  })
}

export function useAnnouncement(id: number | undefined) {
  return useQuery({
    queryKey: notificationKeys.announcement(id ?? 0),
    enabled: id != null,
    queryFn: () => notificationApi.announcement(id!),
  })
}

function useInvalidateAnnouncements() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['announcements'] })
    void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
  }
}

export function useSaveAnnouncement() {
  const invalidate = useInvalidateAnnouncements()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: AnnouncementRequest }) => notificationApi.saveAnnouncement(id, body),
    onSuccess: invalidate,
  })
}

export function useSendAnnouncement() {
  const invalidate = useInvalidateAnnouncements()
  return useMutation({
    mutationFn: ({ id, version }: { id: number; version: number }) => notificationApi.sendAnnouncement(id, version),
    onSuccess: invalidate,
  })
}

export function useDeleteAnnouncement() {
  const invalidate = useInvalidateAnnouncements()
  return useMutation({ mutationFn: (id: number) => notificationApi.removeAnnouncement(id), onSuccess: invalidate })
}
