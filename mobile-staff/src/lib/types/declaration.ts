/** Kê khai từ cư dân. Khớp frontend/src/features/declaration/types.ts. */
import type { Gender, IdDocumentType, Relationship, ResidentRole } from './resident'

export type DeclarationType = 'MEMBER' | 'VEHICLE'
export type DeclarationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'

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
  // MEMBER
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
  // VEHICLE
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

/** Bỏ trống = giữ giá trị cư dân khai. */
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
