import type { Gender } from '@/features/auth/types'

export type IdDocumentType = 'CCCD' | 'PASSPORT'
export type ResidentRole = 'OWNER' | 'TENANT' | 'FAMILY' | 'GUEST'
export type Relationship = 'SPOUSE' | 'CHILD' | 'PARENT' | 'OTHER'
export type ResidenceStatus = 'LIVING' | 'TEMP_ABSENT' | 'MOVED_OUT'
export type AppAccountStatus = 'NONE' | 'ACTIVE' | 'LOCKED'

/** Căn hộ đang ở, gọn cho danh sách. */
export interface ResidentLinkBrief {
  id: number
  apartmentId: number
  apartmentCode: string
  apartmentName: string
  role: ResidentRole
  householdHead: boolean
  residenceStatus: ResidenceStatus
}

export interface ResidentSummary {
  id: number
  buildingId: number
  buildingCode: string
  buildingName: string
  code: string
  fullName: string
  phone: string
  email?: string
  gender?: Gender
  dateOfBirth?: string
  idType?: IdDocumentType
  /** Chỉ hiện 4 ký tự đầu và 3 ký tự cuối. */
  idNumberMasked?: string
  avatarUrl?: string
  apartments: ResidentLinkBrief[]
  residenceStatus: ResidenceStatus
  tempResidenceRegistered: boolean
  appAccountStatus: AppAccountStatus
  createdAt: string
  updatedAt: string
}

/** Một lần cư trú tại một căn (kể cả đã chuyển đi). */
export interface ResidentLink {
  id: number
  residentId: number
  apartmentId: number
  apartmentCode: string
  apartmentName: string
  role: ResidentRole
  relationship?: Relationship
  householdHead: boolean
  moveInDate: string
  moveOutDate?: string
  residenceStatus: ResidenceStatus
  tempResidenceRegistered: boolean
  version: number
}

export interface ResidentDetail {
  id: number
  buildingId: number
  buildingCode: string
  buildingName: string
  code: string
  fullName: string
  phone: string
  email?: string
  gender?: Gender
  dateOfBirth?: string
  idType?: IdDocumentType
  idNumber?: string
  idNumberMasked?: string
  idIssueDate?: string
  idIssuePlace?: string
  nationality?: string
  avatarFileId?: number
  avatarUrl?: string
  appAccountStatus: AppAccountStatus
  note?: string
  apartments: ResidentLink[]
  residenceStatus: ResidenceStatus
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
  version: number
}

export interface LinkRequest {
  apartmentId: number
  role: ResidentRole
  relationship: Relationship | null
  householdHead: boolean
  moveInDate: string
  moveOutDate: string | null
  residenceStatus: ResidenceStatus
  tempResidenceRegistered: boolean
  version?: number
}

/** `apartment` chỉ dùng khi thêm mới (căn hộ đầu tiên); sửa căn hộ qua gán căn hộ / sửa cư trú. */
export interface ResidentRequest {
  code: string | null
  fullName: string
  phone: string
  email: string | null
  gender: Gender | null
  dateOfBirth: string | null
  idType: IdDocumentType | null
  idNumber: string | null
  idIssueDate: string | null
  idIssuePlace: string | null
  nationality: string | null
  avatarFileId: number | null
  note: string | null
  apartment?: LinkRequest
  version?: number
}

/** Một dòng ở tab "Cư dân" của chi tiết căn hộ. */
export interface ApartmentMember {
  linkId: number
  residentId: number
  code: string
  fullName: string
  phone: string
  avatarUrl?: string
  role: ResidentRole
  relationship?: Relationship
  householdHead: boolean
  moveInDate: string
  moveOutDate?: string
  residenceStatus: ResidenceStatus
  tempResidenceRegistered: boolean
  version: number
}

/** Tài khoản app cư dân (BQL cấp; đăng nhập bằng số điện thoại). */
export interface AppAccount {
  residentId: number
  phone: string
  status: 'ACTIVE' | 'LOCKED'
  mustChangePassword: boolean
  lastLoginAt?: string
  createdAt: string
  createdBy?: string
}

export interface AppAccountPassword {
  phone: string
  temporaryPassword: string
}
