import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { TokenResponse } from '@/features/auth/types'
import type { ProblemDetail } from '@/lib/api-types'
import { useAuthStore } from '@/stores/authStore'
import { useBuildingStore } from '@/stores/buildingStore'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Không gửi X-Building-Id (vd lấy danh sách tòa nhà cho bộ chọn ở header). */
    skipBuildingContext?: boolean
  }
}

export const API_BASE = '/api/v1'

export const http = axios.create({ baseURL: API_BASE, withCredentials: true })

const NO_REFRESH_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
]

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  const buildingId = useBuildingStore.getState().selectedBuildingId
  if (buildingId != null && !config.skipBuildingContext) {
    config.headers['X-Building-Id'] = String(buildingId)
  }
  return config
})

let refreshPromise: Promise<string> | null = null

async function callRefresh(): Promise<string> {
  const res = await axios.post<TokenResponse>(`${API_BASE}/auth/refresh`, null, {
    withCredentials: true,
  })
  useAuthStore.getState().setAccessToken(res.data.accessToken)
  return res.data.accessToken
}

/**
 * Refresh token bị xoay vòng mỗi lần dùng và backend thu hồi cả phiên nếu một token cũ bị dùng lại.
 * Vì vậy mọi lời gọi refresh phải dùng chung một promise (nhiều request 401 cùng lúc, StrictMode),
 * và được tuần tự hoá giữa các tab bằng Web Locks: tab chờ sẽ gửi cookie mới mà tab trước vừa nhận.
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  // lib.dom khai báo request() trả Promise<Promise<T>> nhưng thực tế promise được "unwrap".
  const run: Promise<string> = locks
    ? (locks.request('bihome-token-refresh', callRefresh) as unknown as Promise<string>)
    : callRefresh()
  const shared = run.finally(() => {
    refreshPromise = null
  })
  refreshPromise = shared
  return shared
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ProblemDetail>) => {
    const original = error.config as RetriableConfig | undefined
    const status = error.response?.status
    const url = original?.url ?? ''

    if (status === 401 && original && !original._retried && !NO_REFRESH_PATHS.includes(url)) {
      original._retried = true
      try {
        const token = await refreshAccessToken()
        original.headers.Authorization = `Bearer ${token}`
        return http(original)
      } catch {
        useAuthStore.getState().clearSession()
        return Promise.reject(error)
      }
    }

    if (status === 403 && error.response?.data?.code === 'BUILDING_ACCESS_DENIED') {
      // Tòa đã chọn không còn được gán cho user: bỏ chọn để bộ chọn tòa nhà chọn lại.
      useBuildingStore.getState().setSelectedBuildingId(null)
    }
    return Promise.reject(error)
  },
)

/** Backend trả URL dạng /api/v1/files/1; http đã có baseURL nên bỏ tiền tố. */
export function apiPath(url: string): string {
  return url.startsWith(API_BASE) ? url.slice(API_BASE.length) : url
}
