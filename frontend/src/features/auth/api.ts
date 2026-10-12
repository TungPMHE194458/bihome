import { http } from '@/lib/http'
import type {
  ChangePasswordBody,
  LoginBody,
  Me,
  ResetPasswordBody,
  TokenResponse,
} from '@/features/auth/types'

export const authApi = {
  login: (body: LoginBody) => http.post<TokenResponse>('/auth/login', body).then((r) => r.data),
  me: () => http.get<Me>('/auth/me').then((r) => r.data),
  logout: () => http.post<void>('/auth/logout'),
  forgotPassword: (email: string) => http.post<void>('/auth/forgot-password', { email }),
  resetPassword: (body: ResetPasswordBody) => http.post<void>('/auth/reset-password', body),
  changePassword: (body: ChangePasswordBody) =>
    http.post<TokenResponse>('/auth/change-password', body).then((r) => r.data),
}
