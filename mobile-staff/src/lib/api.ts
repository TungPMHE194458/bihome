import axios, { AxiosError, isAxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_BASE, API_URL } from '@/lib/config'
import { KEYS, secureStorage } from '@/lib/storage'
import type { TokenResponse } from '@/lib/types'

/**
 * Phiên đăng nhập: access token trong bộ nhớ, refresh token ở secure storage. Mọi request gửi `X-Client-Type: mobile`
 * nên backend trả refresh token trong body (không dùng cookie như web) và nhận lại qua header `X-Refresh-Token`.
 * Hết hạn (401) thì tự làm mới một lần (các request đang chờ dùng chung) rồi gửi lại; làm mới thất bại → đăng xuất.
 */
let accessToken: string | null = null
let refreshing: Promise<boolean> | null = null
/** Tòa đang chọn → header X-Building-Id; null = "Tất cả tòa" (chỉ người được xem nhiều tòa). */
let buildingId: number | null = null
const handlers = {
  onSignedOut: () => {},
  onMustChangePassword: () => {},
}

const CLIENT_HEADERS = { 'X-Client-Type': 'mobile' }

export const session = {
  get accessToken() {
    return accessToken
  },
  setHandlers(h: Partial<typeof handlers>) {
    Object.assign(handlers, h)
  },
  setBuilding(id: number | null) {
    buildingId = id
  },
  async save(t: TokenResponse) {
    accessToken = t.accessToken
    if (t.refreshToken) await secureStorage.set(KEYS.refreshToken, t.refreshToken)
  },
  async clear() {
    accessToken = null
    await secureStorage.remove(KEYS.refreshToken)
  },
  /** Dùng refresh token đã lưu để lấy access token mới; false = không còn phiên. */
  refresh(): Promise<boolean> {
    refreshing ??= (async () => {
      const refreshToken = await secureStorage.get(KEYS.refreshToken)
      if (!refreshToken) return false
      try {
        const { data } = await axios.post<TokenResponse>(`${API_BASE}/auth/refresh`, null, {
          headers: { ...CLIENT_HEADERS, 'X-Refresh-Token': refreshToken },
        })
        await session.save(data)
        return true
      } catch (e) {
        // Lỗi mạng: giữ refresh token để thử lại sau; token bị từ chối: xoá.
        if (isAxiosError(e) && e.response) await session.clear()
        return false
      }
    })().finally(() => {
      refreshing = null
    })
    return refreshing
  },
}

// axios.create chỉ có trên instance mặc định khi chạy (export riêng `create` chỉ có trong file kiểu).
// eslint-disable-next-line import/no-named-as-default-member
export const http = axios.create({ baseURL: API_BASE, timeout: 20_000, headers: CLIENT_HEADERS })

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  // API dùng chung mọi tòa truyền X-Building-Id: null để không gửi tòa đang chọn.
  if (buildingId != null && !config.headers.has('X-Building-Id')) config.headers['X-Building-Id'] = String(buildingId)
  return config
})

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean }

http.interceptors.response.use(undefined, async (error: AxiosError<ProblemDetail>) => {
  const config = error.config as RetryConfig | undefined
  const status = error.response?.status
  if (status === 401 && config && !config._retried && !config.url?.startsWith('/auth/login')) {
    config._retried = true
    if (await session.refresh()) {
      config.headers.Authorization = `Bearer ${accessToken}`
      return http(config)
    }
    handlers.onSignedOut()
  } else if (status === 403 && error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
    handlers.onMustChangePassword()
  }
  return Promise.reject(error)
})

export interface ProblemDetail {
  title?: string
  detail?: string
  code?: string
  errors?: { field: string; message: string }[]
}

/** Thông báo lỗi tiếng Việt từ ProblemDetail của backend. */
export function errorMessage(error: unknown, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.'): string {
  if (isAxiosError<ProblemDetail>(error)) {
    if (!error.response) return 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.'
    if (error.response.status === 403 && !error.response.data?.detail) return 'Bạn không có quyền thực hiện thao tác này.'
    const data = error.response.data
    return data?.errors?.[0]?.message ?? data?.detail ?? fallback
  }
  return fallback
}

/** Lỗi theo trường (để hiện dưới ô nhập). */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!isAxiosError<ProblemDetail>(error)) return {}
  return Object.fromEntries((error.response?.data?.errors ?? []).map((e) => [e.field, e.message]))
}

/** URL tệp backend trả về dạng /api/v1/files/{id} → địa chỉ đầy đủ. */
export function fileUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  return url.startsWith('/') ? `${API_URL}${url}` : url
}

export function authHeaders(): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
}
