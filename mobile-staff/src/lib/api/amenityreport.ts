import { clean, data, http } from '@/lib/api/shared'
import { downloadExcel } from '@/lib/file'
import type { AmenityReport } from '@/lib/types'

export interface ReportParams {
  from: string
  to: string
  amenityId?: number
  [key: string]: string | number | undefined
}

export const amenityReportApi = {
  get: (p: ReportParams) => data(http.get<AmenityReport>('/amenity-reports', { params: clean(p) })),
  export: async (p: ReportParams) => {
    const qs = new URLSearchParams(clean(p) as Record<string, string>).toString()
    await downloadExcel(`/amenity-reports/export?${qs}`, 'bao-cao-tien-ich.xlsx')
  },
}
