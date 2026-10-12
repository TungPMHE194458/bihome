import type {
  DocumentCategory,
  DocumentCategoryOption,
  DocumentCategoryRequest,
  DocumentFileVersion,
  DocumentItem,
  DocumentRequest,
  ReplaceFileRequest,
} from '@/features/document/types'
import type { ActiveStatus, PageResponse } from '@/lib/api-types'
import { downloadFromApi } from '@/lib/files'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

/** Đường dẫn nội dung tệp (hiện tại hoặc một phiên bản cũ), dùng cho xem trước và tải xuống. */
export const documentContentPath = (id: number, versionId?: number) =>
  versionId == null ? `/documents/${id}/content` : `/documents/${id}/versions/${versionId}/content`

/** Danh mục dùng chung mọi tòa nên gọi không kèm X-Building-Id. */
export const documentApi = {
  categories: (params: ListParams) =>
    http
      .get<PageResponse<DocumentCategory>>('/document-categories', { params, skipBuildingContext: true })
      .then((r) => r.data),
  categoryOptions: () =>
    http
      .get<DocumentCategoryOption[]>('/document-categories/options', { skipBuildingContext: true })
      .then((r) => r.data),
  category: (id: number) =>
    http.get<DocumentCategory>(`/document-categories/${id}`, { skipBuildingContext: true }).then((r) => r.data),
  saveCategory: (id: number | undefined, body: DocumentCategoryRequest) =>
    (id == null
      ? http.post<DocumentCategory>('/document-categories', body, { skipBuildingContext: true })
      : http.put<DocumentCategory>(`/document-categories/${id}`, body, { skipBuildingContext: true })
    ).then((r) => r.data),
  categoryStatus: (id: number, status: ActiveStatus) =>
    http
      .patch<DocumentCategory>(`/document-categories/${id}/status`, { status }, { skipBuildingContext: true })
      .then((r) => r.data),
  removeCategory: (id: number) => http.delete<void>(`/document-categories/${id}`, { skipBuildingContext: true }),

  list: (params: ListParams) => http.get<PageResponse<DocumentItem>>('/documents', { params }).then((r) => r.data),
  tags: (keyword: string) =>
    http.get<string[]>('/documents/tags', { params: { keyword: keyword || undefined } }).then((r) => r.data),
  get: (id: number) => http.get<DocumentItem>(`/documents/${id}`).then((r) => r.data),
  versions: (id: number) => http.get<DocumentFileVersion[]>(`/documents/${id}/versions`).then((r) => r.data),
  save: (id: number | undefined, body: DocumentRequest) =>
    (id == null ? http.post<DocumentItem>('/documents', body) : http.put<DocumentItem>(`/documents/${id}`, body)).then(
      (r) => r.data,
    ),
  replaceFile: (id: number, body: ReplaceFileRequest) =>
    http.post<DocumentItem>(`/documents/${id}/file`, body).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/documents/${id}`),
  /** Tải tệp (hiện tại hoặc phiên bản cũ) về máy. */
  download: (id: number, fileName: string, versionId?: number) =>
    downloadFromApi(documentContentPath(id, versionId), { download: 'true' }, fileName),
  /** Blob để xem trước (PDF/ảnh) trong dialog. */
  previewBlob: (id: number, versionId?: number) =>
    http.get<Blob>(documentContentPath(id, versionId), { responseType: 'blob' }).then((r) => r.data),
}
