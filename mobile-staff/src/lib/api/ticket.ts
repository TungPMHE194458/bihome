import { clean, data, http, noBuilding, type Params } from '@/lib/api/shared'
import type {
  Assignee,
  BoardColumn,
  PageResponse,
  TicketCategory,
  TicketCategoryOption,
  TicketCategoryRequest,
  TicketDetail,
  TicketRequest,
  TicketStatus,
  TicketSummary,
  TimelineEntry,
  Visibility,
} from '@/lib/types'

export const ticketApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<TicketSummary>>('/tickets', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  board: (p: Params) => data(http.get<BoardColumn[]>('/tickets/board', { params: clean(p) })),
  get: (id: number) => data(http.get<TicketDetail>(`/tickets/${id}`)),
  timeline: (id: number) => data(http.get<TimelineEntry[]>(`/tickets/${id}/timeline`)),
  assignees: (buildingId?: number) => data(http.get<Assignee[]>('/tickets/assignees', { params: clean({ buildingId }) })),
  save: (id: number | undefined, body: TicketRequest) =>
    data(id == null ? http.post<TicketDetail>('/tickets', body) : http.put<TicketDetail>(`/tickets/${id}`, body)),
  changeStatus: (id: number, body: { status: TicketStatus; note: string | null; visibility: Visibility; version: number }) =>
    data(http.post<TicketDetail>(`/tickets/${id}/status`, body)),
  assign: (id: number, assigneeId: number | null, version: number) =>
    data(http.put<TicketDetail>(`/tickets/${id}/assignee`, { assigneeId, version })),
  comment: (id: number, content: string, visibility: Visibility, fileIds: number[]) =>
    data(http.post<TimelineEntry>(`/tickets/${id}/comments`, { content, visibility, fileIds })),
  rate: (id: number, rating: number, comment: string | null) =>
    data(http.put<TicketDetail>(`/tickets/${id}/rating`, { rating, comment })),
  remove: (id: number) => http.delete(`/tickets/${id}`),

  // Danh mục yêu cầu dùng chung mọi tòa.
  categories: (p: Params) =>
    data(
      http.get<PageResponse<TicketCategory>>('/ticket-categories', {
        params: clean({ size: 20, sort: 'name,asc', ...p }),
        ...noBuilding,
      }),
    ),
  categoryOptions: () => data(http.get<TicketCategoryOption[]>('/ticket-categories/options', noBuilding)),
  category: (id: number) => data(http.get<TicketCategory>(`/ticket-categories/${id}`, noBuilding)),
  categoryAssignees: () => data(http.get<Assignee[]>('/ticket-categories/assignees', noBuilding)),
  saveCategory: (id: number | undefined, body: TicketCategoryRequest) =>
    data(
      id == null
        ? http.post<TicketCategory>('/ticket-categories', body, noBuilding)
        : http.put<TicketCategory>(`/ticket-categories/${id}`, body, noBuilding),
    ),
  categoryStatus: (id: number, status: 'ACTIVE' | 'INACTIVE') =>
    data(http.patch<TicketCategory>(`/ticket-categories/${id}/status`, { status }, noBuilding)),
  removeCategory: (id: number) => http.delete(`/ticket-categories/${id}`, noBuilding),
}
