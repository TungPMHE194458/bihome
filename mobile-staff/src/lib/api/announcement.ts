import { clean, data, http, type Params } from '@/lib/api/shared'
import type { Announcement, AnnouncementRequest, PageResponse } from '@/lib/types'

export const announcementApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<Announcement>>('/announcements', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  get: (id: number) => data(http.get<Announcement>(`/announcements/${id}`)),
  save: (id: number | undefined, body: AnnouncementRequest) =>
    data(id == null ? http.post<Announcement>('/announcements', body) : http.put<Announcement>(`/announcements/${id}`, body)),
  send: (id: number, version: number) => data(http.post<Announcement>(`/announcements/${id}/send`, { version })),
  remove: (id: number) => http.delete(`/announcements/${id}`),
}
