import type { PickItem } from '@/components/form/AsyncMultiPicker'
import type { Audience } from '@/features/resident/components/AudienceFields'

export type ReminderChannel = 'IN_APP' | 'EMAIL' | 'SMS'
export type ScheduleType = 'NOW' | 'ONCE' | 'MONTHLY'
export type ReminderStatus = 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED'

export interface Reminder {
  id: number
  buildingId: number
  buildingName?: string
  title: string
  /** HTML đã lọc ở backend. */
  content: string
  audience: Audience
  targets: string[]
  targetLabel: string
  targetItems: PickItem[]
  channels: ReminderChannel[]
  scheduleType: ScheduleType
  scheduledAt?: string
  monthlyDay?: number
  /** HH:mm */
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
  status: 'SENT' | 'SKIPPED' | 'FAILED'
  note?: string
  sentAt: string
}
