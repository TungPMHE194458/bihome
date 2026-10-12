export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'

export interface RoleSummary {
  id: number
  code: string
  name: string
}

/** Backend bỏ các trường null khỏi JSON nên trường không bắt buộc có thể vắng mặt. */
export interface Profile {
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

export interface Me {
  id: number
  username: string
  email: string
  phone?: string
  status: UserStatus
  mustChangePassword: boolean
  lastLoginAt?: string
  profile: Profile
  roles: RoleSummary[]
  permissions: string[]
  /** Rỗng khi allBuildings = true. */
  buildingIds: number[]
  allBuildings: boolean
}

export interface TokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  mustChangePassword: boolean
}

export interface LoginBody {
  username: string
  password: string
  rememberMe: boolean
}

export interface ResetPasswordBody {
  email: string
  otp: string
  newPassword: string
  confirmPassword: string
}

export interface ChangePasswordBody {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
