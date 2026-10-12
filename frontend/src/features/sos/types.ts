export type SosType = 'FIRE' | 'MEDICAL' | 'SECURITY' | 'ELEVATOR' | 'OTHER'
export type SosStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM'

export interface SosAlert {
  id: number
  buildingId: number
  buildingName: string
  code: string
  alertType: SosType
  source: 'MANUAL' | 'APP'
  apartmentId?: number | null
  apartmentCode?: string | null
  reporterName?: string | null
  reporterPhone?: string | null
  location?: string | null
  description?: string | null
  status: SosStatus
  acknowledgedAt?: string | null
  acknowledgedBy?: string | null
  resolvedAt?: string | null
  resolvedBy?: string | null
  resolutionNote?: string | null
  createdAt: string
  createdBy?: string | null
  version: number
}

export interface SosActive {
  count: number
  newCount: number
  latestId?: number | null
  latest: SosAlert[]
}

export interface SosRequest {
  alertType: SosType
  apartmentId?: number | null
  reporterName?: string | null
  reporterPhone?: string | null
  location?: string | null
  description?: string | null
}
