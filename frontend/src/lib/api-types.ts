export type ActiveStatus = 'ACTIVE' | 'INACTIVE'

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface FieldErrorItem {
  field: string
  message: string
}

/** Lỗi RFC 7807 do backend trả về (xem GlobalExceptionHandler). */
export interface ProblemDetail {
  type?: string
  title?: string
  status: number
  detail?: string
  code?: string
  errors?: FieldErrorItem[]
}

/** Kết quả nhập Excel theo từng dòng (common/excel/ImportResult). */
export interface ImportResult {
  total: number
  succeeded: number
  failed: number
  /** false khi chọn "Dừng khi có lỗi" và file còn dòng lỗi → không dòng nào được lưu. */
  imported: boolean
  rows: { rowNumber: number; key: string; success: boolean; message: string }[]
}

export type FilePurpose =
  | 'BUILDING_IMAGE'
  | 'APARTMENT_IMAGE'
  | 'AVATAR'
  | 'RESIDENT_AVATAR'
  | 'AMENITY_IMAGE'
  | 'SERVICE_IMAGE'
  | 'METER_IMAGE'
  | 'DOCUMENT'
  | 'TICKET_ATTACHMENT'
  | 'ANNOUNCEMENT_ATTACHMENT'

export interface FileResponse {
  id: number
  name: string
  size: number
  contentType: string
  url: string
}
