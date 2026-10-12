import { create } from 'zustand'
import type { Me } from '@/features/auth/types'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

interface AuthState {
  status: AuthStatus
  /** Chỉ giữ trong bộ nhớ; khi tải lại trang sẽ lấy lại qua /auth/refresh (cookie HttpOnly). */
  accessToken: string | null
  user: Me | null
  setAccessToken: (token: string) => void
  setSession: (token: string, user: Me) => void
  setUser: (user: Me) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  accessToken: null,
  user: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  setSession: (accessToken, user) => set({ accessToken, user, status: 'authenticated' }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ accessToken: null, user: null, status: 'anonymous' }),
}))

export function hasPermission(user: Me | null, permission?: string): boolean {
  if (!permission) return true
  return user?.permissions.includes(permission) ?? false
}

export function usePermission(permission?: string): boolean {
  return useAuthStore((s) => hasPermission(s.user, permission))
}
