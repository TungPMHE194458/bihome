import { clean, data, http, type Params } from '@/lib/api/shared'
import type { Audience, PageResponse, RecipientPreview, Reminder, ReminderDelivery, ReminderRequest } from '@/lib/types'

export const reminderApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<Reminder>>('/reminders', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  get: (id: number) => data(http.get<Reminder>(`/reminders/${id}`)),
  deliveries: (id: number, page = 0) =>
    data(http.get<PageResponse<ReminderDelivery>>(`/reminders/${id}/deliveries`, { params: { page, size: 20 } })),
  save: (id: number | undefined, body: ReminderRequest) =>
    data(id == null ? http.post<Reminder>('/reminders', body) : http.put<Reminder>(`/reminders/${id}`, body)),
  send: (id: number, version: number) => data(http.post<Reminder>(`/reminders/${id}/send`, { version })),
  cancel: (id: number, version: number) => data(http.post<Reminder>(`/reminders/${id}/cancel`, { version })),
  remove: (id: number) => http.delete(`/reminders/${id}`),
  floors: () => data(http.get<string[]>('/reminders/floors')),
  previewRecipients: (audience: Audience, targets: string[]) =>
    data(http.post<RecipientPreview>('/reminders/preview-recipients', { audience, targets })),
}
