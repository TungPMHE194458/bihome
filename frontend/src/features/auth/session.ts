import { authApi } from '@/features/auth/api'
import { refreshAccessToken } from '@/lib/http'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/stores/authStore'

let bootstrapping: Promise<void> | null = null

/** Gọi một lần khi app khởi động: dùng cookie refresh để lấy lại phiên đăng nhập. */
export function bootstrapSession(): Promise<void> {
  bootstrapping ??= (async () => {
    try {
      const token = await refreshAccessToken()
      const me = await authApi.me()
      useAuthStore.getState().setSession(token, me)
    } catch {
      useAuthStore.getState().clearSession()
    }
  })()
  return bootstrapping
}

export async function completeLogin(accessToken: string): Promise<void> {
  useAuthStore.getState().setAccessToken(accessToken)
  const me = await authApi.me()
  useAuthStore.getState().setSession(accessToken, me)
}

export async function reloadCurrentUser(): Promise<void> {
  const me = await authApi.me()
  useAuthStore.getState().setUser(me)
}

export async function logout(): Promise<void> {
  try {
    await authApi.logout()
  } catch {
    // Dù gọi API thất bại vẫn xoá phiên phía client.
  }
  useAuthStore.getState().clearSession()
  queryClient.clear()
}
