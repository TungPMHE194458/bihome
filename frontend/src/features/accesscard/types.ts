export type CardType = 'ELEVATOR' | 'DOOR' | 'PARKING' | 'MULTI'
export type CardStatus = 'IN_STOCK' | 'IN_USE' | 'LOCKED' | 'LOST' | 'REVOKED'
export type HistoryAction = 'CREATED' | 'ISSUED' | 'STATUS_CHANGE' | 'REASSIGNED'

export interface AccessCard {
  id: number
  buildingId: number
  buildingName: string
  cardNo: string
  cardType: CardType
  apartmentId?: number
  apartmentCode?: string
  apartmentName?: string
  residentId?: number
  residentName?: string
  assetItemId?: number
  assetItemName?: string
  plateNumber?: string
  issuedDate?: string
  expiryDate?: string
  /** Đã quá ngày hết hạn. */
  expired: boolean
  issueFee: number
  status: CardStatus
  note?: string
  /** Trạng thái chuyển tới được (theo luồng ở backend). */
  allowedStatuses: CardStatus[]
  createdAt: string
  updatedAt: string
  version: number
}

export interface CardHistoryEntry {
  id: number
  action: HistoryAction
  fromStatus?: CardStatus
  toStatus: CardStatus
  apartmentLabel?: string
  residentName?: string
  note?: string
  actor?: string
  createdAt: string
}

export interface AccessCardRequest {
  cardNo: string
  cardType: CardType
  apartmentId: number | null
  residentId: number | null
  assetItemId: number | null
  issuedDate: string | null
  expiryDate: string | null
  issueFee: number
  note: string | null
  version?: number
}

export interface IssueRequest {
  apartmentId: number
  residentId: number | null
  assetItemId: number | null
  issuedDate: string | null
  expiryDate: string | null
  issueFee: number | null
  note: string | null
  version: number
}
