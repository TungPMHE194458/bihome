import { data, http, noBuilding } from '@/lib/api/shared'
import type { AppNotification, BuildingOption, Dashboard, Me, PageResponse, TokenResponse } from '@/lib/types'

export const authApi = {
  login: (username: string, password: string) =>
    data(http.post<TokenResponse>('/auth/login', { username, password, rememberMe: true })),
  logout: (refreshToken: string | null) =>
    http.post('/auth/logout', null, { headers: refreshToken ? { 'X-Refresh-Token': refreshToken } : {} }),
  changePassword: (currentPassword: string, newPassword: string, refreshToken: string | null) =>
    data(
      http.post<TokenResponse>(
        '/auth/change-password',
        { currentPassword, newPassword, confirmPassword: newPassword },
        { headers: refreshToken ? { 'X-Refresh-Token': refreshToken } : {} },
      ),
    ),
  me: () => data(http.get<Me>('/auth/me', noBuilding)),
  buildings: () => data(http.get<BuildingOption[]>('/buildings/options', noBuilding)),
  registerPushToken: (token: string, platform: 'IOS' | 'ANDROID') =>
    http.post('/notifications/push-tokens', { token, platform }, noBuilding),
  unregisterPushToken: (token: string) => http.delete(`/notifications/push-tokens/${encodeURIComponent(token)}`, noBuilding),

  dashboard: (month: string) => data(http.get<Dashboard>('/dashboard', { params: { month } })),
  notifications: (page = 0) =>
    data(http.get<PageResponse<AppNotification>>('/notifications', { params: { page, size: 20 }, ...noBuilding })),
  unreadCount: () => data(http.get<{ count: number }>('/notifications/unread-count', noBuilding)),
  markRead: (id: number) => http.post(`/notifications/${id}/read`, null, noBuilding),
  markAllRead: () => http.post('/notifications/read-all', null, noBuilding),

  uploadPhoto: (uri: string, name: string, type: string, purpose: string) => {
    const form = new FormData()
    form.append('file', { uri, name, type } as unknown as Blob)
    form.append('purpose', purpose)
    return data(http.post<{ id: number; url: string }>('/files', form, { headers: { 'Content-Type': 'multipart/form-data' } }))
  },
  uploadBlob: (file: Blob, name: string, purpose: string) => {
    const form = new FormData()
    form.append('file', file, name)
    form.append('purpose', purpose)
    return data(http.post<{ id: number; url: string }>('/files', form))
  },
  uploadForm: (form: FormData, purpose: string) => {
    form.append('purpose', purpose)
    return data(http.post<{ id: number; url: string }>('/files', form))
  },
}
