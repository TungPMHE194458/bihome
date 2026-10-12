import type { Reminder, ReminderDelivery, ReminderRequest } from '@/features/reminder/types'
import type { PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

export const reminderApi = {
  list: (params: ListParams) => http.get<PageResponse<Reminder>>('/reminders', { params }).then((r) => r.data),
  get: (id: number) => http.get<Reminder>(`/reminders/${id}`).then((r) => r.data),
  deliveries: (id: number, params: ListParams) =>
    http.get<PageResponse<ReminderDelivery>>(`/reminders/${id}/deliveries`, { params }).then((r) => r.data),
  save: (id: number | undefined, body: ReminderRequest) =>
    (id == null ? http.post<Reminder>('/reminders', body) : http.put<Reminder>(`/reminders/${id}`, body)).then((r) => r.data),
  send: (id: number, version: number) => http.post<Reminder>(`/reminders/${id}/send`, { version }).then((r) => r.data),
  cancel: (id: number, version: number) => http.post<Reminder>(`/reminders/${id}/cancel`, { version }).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/reminders/${id}`),
}
