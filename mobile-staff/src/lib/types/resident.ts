/** Cư dân. Khớp frontend/src/features/resident/types.ts. */

export type IdDocumentType = 'CCCD' | 'PASSPORT'
export type ResidentRole = 'OWNER' | 'TENANT' | 'FAMILY' | 'GUEST'
export type Relationship = 'SPOUSE' | 'CHILD' | 'PARENT' | 'OTHER'
export type ResidenceStatus = 'LIVING' | 'TEMP_ABSENT' | 'MOVED_OUT'
export type AppAccountStatus = 'NONE' | 'ACTIVE' | 'LOCKED'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'

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

export interface ResidentDetail extends ResidentSummary {
  idNumber?: string
  idIssueDate?: string
  idIssuePlace?: string
  nationality?: string
  avatarFileId?: number
  note?: string
  apartments: ResidentLink[]
  createdBy?: string
  updatedBy?: string
  version: number
}

/** Dòng tab "Cư dân" của một căn hộ (xem lib/types/apartment.ts ApartmentMember). */

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
  /** Chỉ gửi khi tạo mới: căn hộ đầu tiên. */
  apartment?: LinkRequest
  version?: number
}

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
