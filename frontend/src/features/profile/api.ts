import type { Gender, Me } from '@/features/auth/types'
import { http } from '@/lib/http'

export interface ProfileUpdateBody {
  fullName: string
  phone: string | null
  gender: Gender | null
  dateOfBirth: string | null
  jobTitle: string | null
  department: string | null
  address: string | null
  bio: string | null
}

export const profileApi = {
  update: (body: ProfileUpdateBody) => http.put<Me>('/profile', body).then((r) => r.data),
  changeAvatar: (fileId: number | null) => http.put<Me>('/profile/avatar', { fileId }).then((r) => r.data),
}
