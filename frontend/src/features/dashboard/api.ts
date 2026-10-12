import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { http } from '@/lib/http'
import { useBuildingStore } from '@/stores/buildingStore'

export interface DashboardSummary {
  /** yyyy-MM */
  month: string
  /** Chỉ Admin hệ thống. */
  system?: { activeUsers: number; loginsToday: number; storageBytes: number; fileCount: number }
  buildingCount: number
  apartmentCount: number
  occupiedApartmentCount: number
  residentCount: number
  openTickets: number
  overdueTickets: number
  ticketsCreatedInMonth: number
  ticketsResolvedInMonth: number
  /** Chưa có module thì vắng mặt → hiển thị "—". */
  amenityBookingsToday?: number
  amenityBookingsInMonth?: number
  /** Tổng còn nợ của thông báo phí đã phát hành tới kỳ được chọn. */
  feeDebt?: number
  /** Tỉ lệ thu (0–1) của kỳ {@link feePeriod}; vắng mặt khi chưa phát hành thông báo phí nào. */
  feeCollectionRate?: number
  feePeriod?: string
  activeAccessCards: number
  validVouchers: number
  ticketsByMonth: { month: number; created: number; resolved: number }[]
  ticketsByCategory: { key: string; name: string; count: number }[]
  openTicketsByStatus: { key: string; name: string; count: number }[]
  recentTickets: {
    id: number
    code: string
    title: string
    status: string
    priority: string
    categoryName: string
    buildingName: string
    overdue: boolean
    createdAt: string
  }[]
  /** 8 tuần (bắt đầu thứ 2) gần nhất của kỳ được chọn. */
  bookingsByWeek: { weekStart: string; bookings: number; people: number }[]
  /** 6 kỳ gần nhất: phát sinh (không gồm nợ chuyển sang) và đã thu. */
  feeByPeriod?: { period: string; billed: number; collected: number }[]
}

export const dashboardApi = {
  summary: (month: string) => http.get<DashboardSummary>('/dashboard', { params: { month } }).then((r) => r.data),
}

export function useDashboard(month: string, enabled = true) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: ['dashboard', buildingId, month],
    queryFn: () => dashboardApi.summary(month),
    placeholderData: keepPreviousData,
    refetchInterval: 5 * 60_000,
    enabled,
  })
}
