import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Platform, Vibration } from 'react-native'
import { useAuth } from '@/lib/auth'
import { api } from '@/lib/staff'

/**
 * Cảnh báo SOS đang mở của tòa đang chọn, hỏi lại mỗi 15 giây (như nút SOS trên web). Có cảnh báo mới hơn lần hỏi
 * trước thì rung máy để nhân viên chú ý ngay cả khi push chưa bật.
 */
export function useSosActive() {
  const { can, buildingId } = useAuth()
  const enabled = can('SOS_READ')
  const query = useQuery({
    queryKey: ['sos', 'active', buildingId],
    queryFn: api.sosActive,
    enabled,
    refetchInterval: 15_000,
  })
  const lastSeen = useRef<number | null>(null)
  const latestId = query.data?.latestId ?? null
  useEffect(() => {
    if (latestId == null) return
    if (lastSeen.current != null && latestId > lastSeen.current && Platform.OS !== 'web') {
      Vibration.vibrate([0, 600, 300, 600, 300, 600])
    }
    lastSeen.current = latestId
  }, [latestId])
  return { ...query, enabled }
}

/** Số việc chờ duyệt theo từng loại (badge tab Duyệt). Thiếu quyền thì không hỏi và tính 0. */
export function usePendingCounts() {
  const { can, buildingId } = useAuth()
  const canBooking = can('AMENITY_BOOKING_WRITE')
  const canDeclaration = can('RESIDENT_WRITE') || can('ASSET_WRITE')
  const canOrder = can('SERVICE_WRITE')
  const bookings = useQuery({
    queryKey: ['pending', 'bookings', buildingId],
    queryFn: () => api.bookings({ status: 'PENDING', size: 10 }),
    enabled: canBooking,
    refetchInterval: 60_000,
  })
  const declarations = useQuery({
    queryKey: ['pending', 'declarations', buildingId],
    queryFn: () => api.declarations({ status: 'PENDING', size: 10 }),
    enabled: canDeclaration,
    refetchInterval: 60_000,
  })
  const orders = useQuery({
    queryKey: ['pending', 'orders', buildingId],
    queryFn: () => api.orders({ status: 'PENDING', size: 10 }),
    enabled: canOrder,
    refetchInterval: 60_000,
  })
  const b = canBooking ? (bookings.data?.totalElements ?? 0) : 0
  const d = canDeclaration ? (declarations.data?.totalElements ?? 0) : 0
  const o = canOrder ? (orders.data?.totalElements ?? 0) : 0
  return {
    bookings: b,
    declarations: d,
    orders: o,
    total: b + d + o,
    canBooking,
    canDeclaration,
    canOrder,
    any: canBooking || canDeclaration || canOrder,
  }
}

export function useUnreadCount() {
  return useQuery({ queryKey: ['notifications', 'unread'], queryFn: api.unreadCount, refetchInterval: 30_000 })
}
