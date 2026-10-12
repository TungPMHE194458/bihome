import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ticketApi, type ListParams } from '@/features/ticket/api'
import type { TicketCategoryRequest, TicketRequest, TicketStatus, Visibility } from '@/features/ticket/types'
import type { ActiveStatus } from '@/lib/api-types'
import { useBuildingStore } from '@/stores/buildingStore'

export const ticketKeys = {
  all: ['tickets'] as const,
  categories: (params: ListParams) => [...ticketKeys.all, 'categories', params] as const,
  categoryOptions: () => [...ticketKeys.all, 'category-options'] as const,
  category: (id: number) => [...ticketKeys.all, 'category', id] as const,
  categoryAssignees: () => [...ticketKeys.all, 'category-assignees'] as const,
  /** Gồm tòa đang chọn vì API lọc theo X-Building-Id. */
  list: (params: ListParams, buildingId: number | null) => [...ticketKeys.all, 'list', buildingId, params] as const,
  board: (params: ListParams, buildingId: number | null) => [...ticketKeys.all, 'board', buildingId, params] as const,
  assignees: (buildingId: number | null) => [...ticketKeys.all, 'assignees', buildingId] as const,
  detail: (id: number) => [...ticketKeys.all, 'detail', id] as const,
  timeline: (id: number) => [...ticketKeys.all, 'timeline', id] as const,
}

export function useTicketCategories(params: ListParams) {
  return useQuery({
    queryKey: ticketKeys.categories(params),
    queryFn: () => ticketApi.categories(params),
    placeholderData: keepPreviousData,
  })
}

export function useTicketCategoryOptions() {
  return useQuery({ queryKey: ticketKeys.categoryOptions(), queryFn: ticketApi.categoryOptions, staleTime: 60_000 })
}

export function useTicketCategory(id: number | undefined) {
  return useQuery({ queryKey: ticketKeys.category(id ?? 0), enabled: id != null, queryFn: () => ticketApi.category(id!) })
}

export function useCategoryAssignees(enabled: boolean) {
  return useQuery({ queryKey: ticketKeys.categoryAssignees(), queryFn: ticketApi.categoryAssignees, enabled })
}

export function useTickets(params: ListParams, enabled = true) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: ticketKeys.list(params, buildingId),
    queryFn: () => ticketApi.list(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useTicketBoard(params: ListParams, enabled = true) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: ticketKeys.board(params, buildingId),
    queryFn: () => ticketApi.board(params),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** Người nhận xử lý ở một tòa (mặc định tòa đang chọn). */
export function useAssignees(buildingId: number | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.assignees(buildingId ?? null),
    queryFn: () => ticketApi.assignees(buildingId ?? undefined),
    enabled: enabled && buildingId != null,
    staleTime: 60_000,
  })
}

export function useTicket(id: number | undefined) {
  return useQuery({ queryKey: ticketKeys.detail(id ?? 0), enabled: id != null, queryFn: () => ticketApi.get(id!) })
}

export function useTimeline(id: number | undefined) {
  return useQuery({ queryKey: ticketKeys.timeline(id ?? 0), enabled: id != null, queryFn: () => ticketApi.timeline(id!) })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ticketKeys.all })
}

export function useSaveTicketCategory() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: TicketCategoryRequest }) => ticketApi.saveCategory(id, body),
    onSuccess: invalidate,
  })
}

export function useChangeTicketCategoryStatus() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ActiveStatus }) => ticketApi.categoryStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useDeleteTicketCategory() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: number) => ticketApi.removeCategory(id), onSuccess: invalidate })
}

export function useSaveTicket() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: TicketRequest }) => ticketApi.save(id, body),
    onSuccess: invalidate,
  })
}

export function useChangeTicketStatus() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number
      status: TicketStatus
      note: string | null
      visibility?: Visibility
      version: number
    }) => ticketApi.changeStatus(id, body),
    onSuccess: invalidate,
  })
}

export function useAssignTicket() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, assigneeId, version }: { id: number; assigneeId: number | null; version: number }) =>
      ticketApi.assign(id, assigneeId, version),
    onSuccess: invalidate,
  })
}

export function useCommentTicket() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number; content: string; visibility: Visibility; fileIds: number[] }) =>
      ticketApi.comment(id, body),
    onSuccess: invalidate,
  })
}

export function useRateTicket() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, rating, comment }: { id: number; rating: number; comment: string | null }) =>
      ticketApi.rate(id, rating, comment),
    onSuccess: invalidate,
  })
}

export function useDeleteTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => ticketApi.remove(id),
    // Không gọi lại chi tiết/dòng thời gian của yêu cầu vừa xoá (sẽ 404).
    onSuccess: (_, id) =>
      queryClient.invalidateQueries({
        queryKey: ticketKeys.all,
        predicate: (q) => !(q.queryKey[1] === 'detail' || q.queryKey[1] === 'timeline') || q.queryKey[2] !== id,
      }),
  })
}
