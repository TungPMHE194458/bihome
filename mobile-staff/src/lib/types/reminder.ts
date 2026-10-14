/** Nhắc nhở. Khớp frontend/src/features/reminder/types.ts. */

export type ReminderStatus = 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED'
export type ReminderChannel = 'IN_APP' | 'EMAIL' | 'SMS'
export type ScheduleType = 'NOW' | 'ONCE' | 'MONTHLY'
export type Audience = 'ALL' | 'FLOOR' | 'APARTMENT' | 'RESIDENT'
export type DeliveryStatus = 'SENT' | 'SKIPPED' | 'FAILED'

export interface PickItem {
  value: string
  label: string
}

export interface Reminder {
  id: number
  buildingId: number
  buildingName?: string
  title: string
  /** HTML đã được backend lọc an toàn. */
  content: string
  audience: Audience
  targets: string[]
  targetLabel: string
  targetItems: PickItem[]
  channels: ReminderChannel[]
  scheduleType: ScheduleType
  scheduledAt?: string
  monthlyDay?: number
  monthlyTime?: string
  endDate?: string
  nextRunAt?: string
  lastSentAt?: string
  runCount: number
  recipientCount: number
  status: ReminderStatus
  createdAt: string
  updatedAt: string
  createdBy?: string
  version: number
}

export interface ReminderRequest {
  title: string
  content: string
  audience: Audience
  targets: string[]
  channels: ReminderChannel[]
  scheduleType: ScheduleType
  scheduledAt: string | null
  monthlyDay: number | null
  monthlyTime: string | null
  endDate: string | null
  draft: boolean
  version?: number
}

export interface ReminderDelivery {
  id: number
  runNo: number
  residentId: number
  residentName: string
  apartmentCode?: string
  channel: ReminderChannel
  destination?: string
  status: DeliveryStatus
  note?: string
  sentAt: string
}

export interface RecipientPreview {
  count: number
  withEmail: number
  withPhone: number
  sample: string[]
}
