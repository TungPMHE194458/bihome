import { clean, data, http, noBuilding, type Params } from '@/lib/api/shared'
import type {
  DocumentCategory,
  DocumentCategoryOption,
  DocumentCategoryRequest,
  DocumentFileVersion,
  DocumentItem,
  DocumentRequest,
  PageResponse,
  ReplaceFileRequest,
} from '@/lib/types'

export const documentApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<DocumentItem>>('/documents', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  tags: (keyword?: string) => data(http.get<string[]>('/documents/tags', { params: clean({ keyword }) })),
  get: (id: number) => data(http.get<DocumentItem>(`/documents/${id}`)),
  save: (id: number | undefined, body: DocumentRequest) =>
    data(id == null ? http.post<DocumentItem>('/documents', body) : http.put<DocumentItem>(`/documents/${id}`, body)),
  replaceFile: (id: number, body: ReplaceFileRequest) => data(http.post<DocumentItem>(`/documents/${id}/file`, body)),
  versions: (id: number) => data(http.get<DocumentFileVersion[]>(`/documents/${id}/versions`)),
  remove: (id: number) => http.delete(`/documents/${id}`),

  // Danh mục tài liệu dùng chung mọi tòa.
  categories: (p: Params) =>
    data(
      http.get<PageResponse<DocumentCategory>>('/document-categories', {
        params: clean({ size: 20, sort: 'name,asc', ...p }),
        ...noBuilding,
      }),
    ),
  categoryOptions: () => data(http.get<DocumentCategoryOption[]>('/document-categories/options', noBuilding)),
  category: (id: number) => data(http.get<DocumentCategory>(`/document-categories/${id}`, noBuilding)),
  saveCategory: (id: number | undefined, body: DocumentCategoryRequest) =>
    data(
      id == null
        ? http.post<DocumentCategory>('/document-categories', body, noBuilding)
        : http.put<DocumentCategory>(`/document-categories/${id}`, body, noBuilding),
    ),
  categoryStatus: (id: number, status: 'ACTIVE' | 'INACTIVE') =>
    data(http.patch<DocumentCategory>(`/document-categories/${id}/status`, { status }, noBuilding)),
  removeCategory: (id: number) => http.delete(`/document-categories/${id}`, noBuilding),
}
