import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { documentApi, type ListParams } from '@/features/document/api'
import type { DocumentCategoryRequest, DocumentRequest, ReplaceFileRequest } from '@/features/document/types'
import type { ActiveStatus } from '@/lib/api-types'
import { useBuildingStore } from '@/stores/buildingStore'

export const documentKeys = {
  all: ['documents'] as const,
  categories: (params: ListParams) => [...documentKeys.all, 'categories', params] as const,
  categoryOptions: () => [...documentKeys.all, 'category-options'] as const,
  category: (id: number) => [...documentKeys.all, 'category', id] as const,
  /** Gồm tòa đang chọn vì API lọc theo X-Building-Id. */
  list: (params: ListParams, buildingId: number | null) => [...documentKeys.all, 'list', buildingId, params] as const,
  detail: (id: number) => [...documentKeys.all, 'detail', id] as const,
  versions: (id: number) => [...documentKeys.all, 'versions', id] as const,
  tags: (keyword: string, buildingId: number | null) => [...documentKeys.all, 'tags', buildingId, keyword] as const,
}

export function useDocumentCategories(params: ListParams) {
  return useQuery({
    queryKey: documentKeys.categories(params),
    queryFn: () => documentApi.categories(params),
    placeholderData: keepPreviousData,
  })
}

export function useDocumentCategoryOptions() {
  return useQuery({ queryKey: documentKeys.categoryOptions(), queryFn: documentApi.categoryOptions, staleTime: 60_000 })
}

export function useDocumentCategory(id: number | undefined) {
  return useQuery({
    queryKey: documentKeys.category(id ?? 0),
    enabled: id != null,
    queryFn: () => documentApi.category(id!),
  })
}

export function useDocuments(params: ListParams) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: documentKeys.list(params, buildingId),
    queryFn: () => documentApi.list(params),
    placeholderData: keepPreviousData,
  })
}

export function useDocument(id: number | undefined) {
  return useQuery({ queryKey: documentKeys.detail(id ?? 0), enabled: id != null, queryFn: () => documentApi.get(id!) })
}

export function useDocumentVersions(id: number | undefined) {
  return useQuery({
    queryKey: documentKeys.versions(id ?? 0),
    enabled: id != null,
    queryFn: () => documentApi.versions(id!),
  })
}

export function useTagSuggestions(keyword: string) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: documentKeys.tags(keyword, buildingId),
    queryFn: () => documentApi.tags(keyword),
    staleTime: 30_000,
  })
}

/** Danh mục và tài liệu hiển thị lẫn nhau (số tài liệu, tên/màu chip) nên làm mới chung một khoá. */
function useInvalidate() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: documentKeys.all })
}

export function useSaveDocumentCategory() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: DocumentCategoryRequest }) => documentApi.saveCategory(id, body),
    onSuccess: invalidate,
  })
}

export function useChangeDocumentCategoryStatus() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ActiveStatus }) => documentApi.categoryStatus(id, status),
    onSuccess: invalidate,
  })
}

export function useDeleteDocumentCategory() {
  const invalidate = useInvalidate()
  return useMutation({ mutationFn: (id: number) => documentApi.removeCategory(id), onSuccess: invalidate })
}

export function useSaveDocument() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: DocumentRequest }) => documentApi.save(id, body),
    onSuccess: invalidate,
  })
}

export function useReplaceDocumentFile() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ReplaceFileRequest }) => documentApi.replaceFile(id, body),
    onSuccess: invalidate,
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => documentApi.remove(id),
    // Không gọi lại chi tiết/phiên bản của tài liệu vừa xoá (sẽ 404).
    onSuccess: (_, id) =>
      queryClient.invalidateQueries({
        queryKey: documentKeys.all,
        predicate: (q) => !(q.queryKey[1] === 'detail' || q.queryKey[1] === 'versions') || q.queryKey[2] !== id,
      }),
  })
}
