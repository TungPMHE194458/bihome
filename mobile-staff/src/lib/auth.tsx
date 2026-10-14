import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { session } from '@/lib/api'
import { currentPushToken, registerForPush } from '@/lib/push'
import { api } from '@/lib/staff'
import { KEYS, secureStorage } from '@/lib/storage'
import type { BuildingOption, Me } from '@/lib/types'

type Status = 'loading' | 'signedOut' | 'signedIn'

interface AuthState {
  status: Status
  me: Me | null
  mustChangePassword: boolean
  /** Tòa người dùng được làm việc (Admin hệ thống: mọi tòa). */
  buildings: BuildingOption[]
  /** Tòa đang chọn; null = Tất cả tòa được giao. */
  buildingId: number | null
  /** Được chọn "Tất cả tòa" (Admin hệ thống hoặc được giao nhiều tòa). */
  canSelectAll: boolean
  can: (permission: string) => boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  changePassword: (current: string, next: string) => Promise<void>
  selectBuilding: (id: number | null) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [status, setStatus] = useState<Status>('loading')
  const [me, setMe] = useState<Me | null>(null)
  const [buildings, setBuildings] = useState<BuildingOption[]>([])
  const [buildingId, setBuildingId] = useState<number | null>(null)
  const [mustChangePassword, setMustChangePassword] = useState(false)

  const signOutLocally = useCallback(async () => {
    await session.clear()
    session.setBuilding(null)
    qc.clear()
    setMe(null)
    setBuildings([])
    setMustChangePassword(false)
    setStatus('signedOut')
  }, [qc])

  const loadMe = useCallback(async () => {
    const profile = await api.me()
    setMe(profile)
    setMustChangePassword(profile.mustChangePassword)
    if (!profile.mustChangePassword) {
      const options = await api.buildings()
      const saved = await secureStorage.get(KEYS.building)
      const multi = profile.allBuildings || options.length > 1
      // Tòa đã chọn lần trước (nếu còn được giao); không có thì "Tất cả" khi được xem nhiều tòa, hoặc tòa duy nhất.
      const selected = options.some((b) => String(b.id) === saved) ? Number(saved) : multi ? null : (options[0]?.id ?? null)
      setBuildings(options)
      setBuildingId(selected)
      session.setBuilding(selected)
      void registerForPush()
    }
    setStatus('signedIn')
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

  const value = useMemo<AuthState>(() => {
    const permissions = new Set(me?.permissions ?? [])
    return {
      status,
      me,
      mustChangePassword,
      buildings,
      buildingId,
      canSelectAll: !!me && (me.allBuildings || buildings.length > 1),
      can: (p) => permissions.has(p),
      login: async (username, password) => {
        const tokens = await api.login(username, password)
        await session.save(tokens)
        await loadMe()
      },
      logout: async () => {
        try {
          const push = currentPushToken()
          if (push) await api.unregisterPushToken(push)
          await api.logout(await secureStorage.get(KEYS.refreshToken))
        } catch {
          // Mạng lỗi vẫn đăng xuất trên máy.
        }
        await signOutLocally()
      },
      changePassword: async (current, next) => {
        const tokens = await api.changePassword(current, next, await secureStorage.get(KEYS.refreshToken))
        await session.save(tokens)
        await loadMe()
      },
      selectBuilding: (id) => {
        setBuildingId(id)
        session.setBuilding(id)
        void secureStorage.set(KEYS.building, id == null ? 'all' : String(id))
        // Dữ liệu theo tòa: tải lại theo tòa mới.
        qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'notifications' })
      },
    }
  }, [status, me, mustChangePassword, buildings, buildingId, loadMe, signOutLocally, qc])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider')
  return ctx
}

/** Tên tòa đang chọn để hiện ở đầu màn hình. */
export function useBuildingName(): string {
  const { buildings, buildingId } = useAuth()
  if (buildingId == null) return buildings.length === 1 ? buildings[0].name : 'Tất cả tòa nhà'
  return buildings.find((b) => b.id === buildingId)?.name ?? 'Tòa nhà'
}
