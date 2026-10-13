import type { Gender } from '@/features/auth/types'
import type { IdDocumentType, Relationship, ResidentRole } from '@/features/resident/types'

export type DeclarationType = 'MEMBER' | 'VEHICLE'
export type DeclarationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

/** Phiếu kê khai từ app cư dân (thành viên gia đình / xe). */
export interface Declaration {
  id: number
  buildingId: number
  code: string
  type: DeclarationType
  status: DeclarationStatus
  apartmentId: number
  apartmentCode: string
  submittedById: number
  submittedByName?: string
  submittedByPhone?: string
  fullName?: string
  phone?: string
  email?: string
  gender?: Gender
  dateOfBirth?: string
  idType?: IdDocumentType
  idNumber?: string
  role?: ResidentRole
  relationship?: Relationship
  moveInDate?: string
  photoUrl?: string
  categoryId?: number
  categoryName?: string
  vehicleName?: string
  plateNumber?: string
  vehicleDescription?: string
  note?: string
  reviewedAt?: string
  reviewedBy?: string
  rejectReason?: string
  resultResidentId?: number
  resultAssetItemId?: number
  createdAt: string
  version: number
}

/** BQL duyệt: bản đã soát lại (bỏ trống = giữ giá trị cư dân khai). */
export interface ApproveRequest {
  fullName?: string | null
  phone?: string | null
  email?: string | null
  gender?: Gender | null
  dateOfBirth?: string | null
  idType?: IdDocumentType | null
  idNumber?: string | null
  role?: ResidentRole | null
  relationship?: Relationship | null
  moveInDate?: string | null
  categoryId?: number | null
  vehicleName?: string | null
  plateNumber?: string | null
  vehicleDescription?: string | null
  version: number
}
