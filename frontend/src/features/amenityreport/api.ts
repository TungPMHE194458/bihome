import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { downloadFromApi } from '@/lib/files'
import { http } from '@/lib/http'
import { useBuildingStore } from '@/stores/buildingStore'

export interface AmenityReport {
  from: string
  to: string
  totalBookings: number
  activeBookings: number
  cancelledBookings: number
  people: number
  /** 0–1 */
  fillRate: number
  cancelRate: number
  revenue: number
  collected: number
  byDay: { date: string; bookings: number; people: number }[]
  byAmenity: {
    amenityId: number
    code: string
    name: string
    bookings: number
    cancelled: number
    people: number
    capacity: number
    fillRate: number
    revenue: number
  }[]
  bySlot: { startTime: string; bookings: number; people: number }[]
  byStatus: { status: string; count: number }[]
}

export interface ReportParams {
  from: string
  to: string
  amenityId?: number
}

const params = (p: ReportParams) => ({ from: p.from, to: p.to, ...(p.amenityId ? { amenityId: p.amenityId } : {}) })

export const reportApi = {
  get: (p: ReportParams) => http.get<AmenityReport>('/amenity-reports', { params: params(p) }).then((r) => r.data),
  exportExcel: (p: ReportParams) => downloadFromApi('/amenity-reports/export', params(p), 'bao-cao-tien-ich.xlsx'),
}

export function useAmenityReport(p: ReportParams) {
  const buildingId = useBuildingStore((s) => s.selectedBuildingId)
  return useQuery({
    queryKey: ['amenity-report', buildingId, p],
    queryFn: () => reportApi.get(p),
    placeholderData: keepPreviousData,
  })
}
