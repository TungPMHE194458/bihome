import type { Gender, Profile, RoleSummary, UserStatus } from '@/features/auth/types'

export interface UserSummary {
  id: number
  username: string
  email: string
  phone?: string
  fullName: string
  avatarUrl?: string
  roles: RoleSummary[]
  buildingIds: number[]
  status: UserStatus
  temporarilyLocked: boolean
  lastLoginAt?: string
  createdAt: string
}

export interface UserDetail {
  id: number
  username: string
  email: string
  phone?: string
  status: UserStatus
  mustChangePassword: boolean
  lockedUntil?: string
  lastLoginAt?: string
  profile: Profile
  roles: RoleSummary[]
  buildingIds: number[]
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
  version: number
}

interface ProfileFields {
  email: string
  phone: string | null
  fullName: string
  gender: Gender | null
  dateOfBirth: string | null
  jobTitle: string | null
  department: string | null
  address: string | null
}

export interface UserCreateRequest extends ProfileFields {
  username: string
  roleCodes: string[]
  buildingIds: number[]
}

export interface UserUpdateRequest extends ProfileFields {
  bio: string | null
  version: number
}

export interface UserCreated {
  user: UserDetail
  temporaryPassword: string
}
