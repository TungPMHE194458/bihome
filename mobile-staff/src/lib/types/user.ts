/** Người dùng hệ thống + vai trò (đọc; vai trò chỉ xem trên app, sửa quyền dùng web). Khớp frontend/src/features/user. */
import type { Gender } from './resident'

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED'

export const SUPER_ADMIN = 'SUPER_ADMIN'

export interface RoleSummary {
  id: number
  code: string
  name: string
}

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

export interface ProfileInfo {
  fullName: string
  avatarFileId?: number
  avatarUrl?: string
  gender?: Gender
  dateOfBirth?: string
  jobTitle?: string
  department?: string
  address?: string
  bio?: string
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
  profile: ProfileInfo
  roles: RoleSummary[]
  buildingIds: number[]
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
  version: number
}

export interface UserCreateRequest {
  username: string
  email: string
  phone: string | null
  fullName: string
  gender: Gender | null
  dateOfBirth: string | null
  jobTitle: string | null
  department: string | null
  address: string | null
  roleCodes: string[]
  buildingIds: number[]
}

export interface UserUpdateRequest {
  email: string
  phone: string | null
  fullName: string
  gender: Gender | null
  dateOfBirth: string | null
  jobTitle: string | null
  department: string | null
  address: string | null
  bio: string | null
  version: number
}

export interface UserCreatedResult {
  user: UserDetail
  temporaryPassword: string
}

/** Khớp màu quyền với từng module ở Danh mục quyền. */
export interface Permission {
  code: string
  module: string
  action: string
  name: string
}

export interface RoleDetail {
  id: number
  code: string
  name: string
  description?: string
  system: boolean
  /** Admin hệ thống: luôn có mọi quyền, không sửa được. */
  allPermissions: boolean
  userCount: number
  permissions: string[]
  updatedAt: string
  updatedBy?: string
  version: number
}
