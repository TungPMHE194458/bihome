/** SOS. */

export type SosType = 'FIRE' | 'MEDICAL' | 'SECURITY' | 'ELEVATOR' | 'OTHER'
export type SosStatus = 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_ALARM'

export interface SosAlert {
  id: number
  buildingId: number
  buildingName: string
  code: string
  alertType: SosType
  source: 'MANUAL' | 'APP'
  apartmentId?: number
  apartmentCode?: string
  reporterName?: string
  reporterPhone?: string
  location?: string
  description?: string
  status: SosStatus
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolvedAt?: string
  resolvedBy?: string
  resolutionNote?: string
  createdAt: string
  version: number
}

export interface SosActive {
  count: number
  newCount: number
  latestId?: number
  latest: SosAlert[]
}
