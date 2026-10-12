export interface VietQrSettings {
  buildingId: number
  buildingName: string
  bankBin?: string | null
  accountNo?: string | null
  accountName?: string | null
  contentTemplate: string
  enabled: boolean
  sampleContent: string
  webhookPath: string
  simulationEnabled: boolean
  version?: number | null
}

export interface VietQrRequest {
  bankBin: string
  accountNo: string
  accountName: string
  contentTemplate: string
  enabled: boolean
  version?: number | null
}

export type MatchStatus = 'MATCHED' | 'MISMATCHED' | 'UNMATCHED'

export interface BankTransaction {
  id: number
  buildingId?: number | null
  bankReference: string
  accountNo?: string | null
  amount: number
  content?: string | null
  transactedAt: string
  matchStatus: MatchStatus
  matchNote?: string | null
  feeNoticeId?: number | null
  feeNoticeCode?: string | null
  paymentId?: number | null
  paymentCode?: string | null
  simulated: boolean
  createdAt: string
}

export interface WebhookResult {
  status: MatchStatus | 'DUPLICATE'
  bankTransactionId?: number | null
  feeNoticeCode?: string | null
  paymentCode?: string | null
  message?: string | null
}
