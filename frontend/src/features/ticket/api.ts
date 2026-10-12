import type {
  Assignee,
  BoardColumn,
  TicketCategory,
  TicketCategoryOption,
  TicketCategoryRequest,
  TicketDetail,
  TicketRequest,
  TicketStatus,
  TicketSummary,
  TimelineEntry,
  Visibility,
} from '@/features/ticket/types'
import type { ActiveStatus, PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

/** Danh mục dùng chung mọi tòa nên gọi không kèm X-Building-Id; yêu cầu thì theo tòa đang chọn. */
export const ticketApi = {
  categories: (params: ListParams) =>
    http.get<PageResponse<TicketCategory>>('/ticket-categories', { params, skipBuildingContext: true }).then((r) => r.data),
  categoryOptions: () =>
    http.get<TicketCategoryOption[]>('/ticket-categories/options', { skipBuildingContext: true }).then((r) => r.data),
  category: (id: number) =>
    http.get<TicketCategory>(`/ticket-categories/${id}`, { skipBuildingContext: true }).then((r) => r.data),
  categoryAssignees: () =>
    http.get<Assignee[]>('/ticket-categories/assignees', { skipBuildingContext: true }).then((r) => r.data),
  saveCategory: (id: number | undefined, body: TicketCategoryRequest) =>
    (id == null
      ? http.post<TicketCategory>('/ticket-categories', body, { skipBuildingContext: true })
      : http.put<TicketCategory>(`/ticket-categories/${id}`, body, { skipBuildingContext: true })
    ).then((r) => r.data),
  categoryStatus: (id: number, status: ActiveStatus) =>
    http
      .patch<TicketCategory>(`/ticket-categories/${id}/status`, { status }, { skipBuildingContext: true })
      .then((r) => r.data),
  removeCategory: (id: number) => http.delete<void>(`/ticket-categories/${id}`, { skipBuildingContext: true }),

  list: (params: ListParams) => http.get<PageResponse<TicketSummary>>('/tickets', { params }).then((r) => r.data),
  board: (params: ListParams) => http.get<BoardColumn[]>('/tickets/board', { params }).then((r) => r.data),
  assignees: (buildingId?: number) =>
    http.get<Assignee[]>('/tickets/assignees', { params: { buildingId } }).then((r) => r.data),
  get: (id: number) => http.get<TicketDetail>(`/tickets/${id}`).then((r) => r.data),
  timeline: (id: number) => http.get<TimelineEntry[]>(`/tickets/${id}/timeline`).then((r) => r.data),
  save: (id: number | undefined, body: TicketRequest) =>
    (id == null ? http.post<TicketDetail>('/tickets', body) : http.put<TicketDetail>(`/tickets/${id}`, body)).then(
      (r) => r.data,
    ),
  changeStatus: (id: number, body: { status: TicketStatus; note: string | null; visibility?: Visibility; version: number }) =>
    http.post<TicketDetail>(`/tickets/${id}/status`, body).then((r) => r.data),
  assign: (id: number, assigneeId: number | null, version: number) =>
    http.put<TicketDetail>(`/tickets/${id}/assignee`, { assigneeId, version }).then((r) => r.data),
  comment: (id: number, body: { content: string; visibility: Visibility; fileIds: number[] }) =>
    http.post<TimelineEntry>(`/tickets/${id}/comments`, body).then((r) => r.data),
  rate: (id: number, rating: number, comment: string | null) =>
    http.put<TicketDetail>(`/tickets/${id}/rating`, { rating, comment }).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/tickets/${id}`),
}
