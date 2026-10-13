import * as Device from 'expo-device'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { session } from '@/lib/api'
import { api } from '@/lib/resident'
import { KEYS, secureStorage } from '@/lib/storage'
import type { Apartment, Me } from '@/lib/types'
import { currentPushToken, registerForPush } from '@/lib/push'

type Status = 'loading' | 'signedOut' | 'signedIn'

interface AuthState {
  status: Status
  me: Me | null
  /** Căn đang xem (cư dân ở nhiều căn thì chọn ở Trang chủ). */
  apartment: Apartment | null
  mustChangePassword: boolean
  login: (phone: string, password: string) => Promise<void>
  logout: () => Promise<void>
  changePassword: (current: string, next: string) => Promise<void>
  selectApartment: (id: number) => void
  reloadMe: () => Promise<void>
  /** Sau khi xoá tài khoản: bỏ phiên trên máy (server đã xoá). */
  forget: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [status, setStatus] = useState<Status>('loading')
  const [me, setMe] = useState<Me | null>(null)
  const [apartmentId, setApartmentId] = useState<number | null>(null)
  const [mustChangePassword, setMustChangePassword] = useState(false)

  const signOutLocally = useCallback(async () => {
    await session.clear()
    qc.clear()
    setMe(null)
    setMustChangePassword(false)
    setStatus('signedOut')
  }, [qc])

  const loadMe = useCallback(async () => {
    const profile = await api.me()
    const saved = Number(await secureStorage.get(KEYS.apartmentId))
    setMe(profile)
    setMustChangePassword(profile.mustChangePassword)
    setApartmentId(profile.apartments.some((a) => a.id === saved) ? saved : (profile.apartments[0]?.id ?? null))
    setStatus('signedIn')
    if (!profile.mustChangePassword) void registerForPush()
  }, [])

  // Khởi động: còn refresh token thì tự đăng nhập lại.
  useEffect(() => {
    session.setHandlers({
      onSignedOut: () => void signOutLocally(),
      onMustChangePassword: () => setMustChangePassword(true),
    })
    void (async () => {
      try {
        if (await session.refresh()) {
          await loadMe()
          return
        }
      } catch {
        // rơi xuống đăng xuất
      }
      setStatus('signedOut')
    })()
  }, [loadMe, signOutLocally])

  const value = useMemo<AuthState>(() => ({
    status,
    me,
    apartment: me?.apartments.find((a) => a.id === apartmentId) ?? null,
    mustChangePassword,
    login: async (phone, password) => {
      const tokens = await api.login(phone, password, Device.deviceName ?? Device.modelName ?? undefined)
      await session.save(tokens)
      await loadMe()
    },
    logout: async () => {
      try {
        await api.logout(await secureStorage.get(KEYS.refreshToken), currentPushToken())
      } catch {
        // Mạng lỗi vẫn đăng xuất trên máy.
      }
      await signOutLocally()
    },
    changePassword: async (current, next) => {
      const tokens = await api.changePassword(current, next)
      await session.save(tokens)
      await loadMe()
    },
    selectApartment: (id) => {
      setApartmentId(id)
      void secureStorage.set(KEYS.apartmentId, String(id))
      qc.removeQueries({ predicate: (q) => q.queryKey.includes('apt') })
    },
    reloadMe: loadMe,
    forget: signOutLocally,
  }), [status, me, apartmentId, mustChangePassword, loadMe, signOutLocally, qc])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider')
  return ctx
}

/** Căn đang chọn (màn hình sau đăng nhập luôn có). */
export function useApartment(): Apartment {
  const { apartment } = useAuth()
  if (!apartment) throw new Error('Chưa có căn hộ')
  return apartment
}
