import type { IconName } from '@/components/ui'
import type { Tone } from '@/theme'
import type { NotificationType } from '@/lib/types'

export interface Chip {
  label: string
  tone: Tone
}

export const NOTIFICATION_ICON: Record<NotificationType, IconName> = {
  TICKET_CREATED: 'message-plus-outline',
  TICKET_ASSIGNED: 'account-arrow-right-outline',
  TICKET_STATUS: 'progress-check',
  TICKET_COMMENT: 'comment-text-outline',
  ANNOUNCEMENT: 'bullhorn-outline',
  BOOKING_PENDING: 'calendar-clock',
  PAYMENT_RECEIVED: 'cash-check',
  SOS_ALERT: 'alarm-light-outline',
  DECLARATION: 'clipboard-account-outline',
  SYSTEM: 'information-outline',
}

export function toOptions<K extends string>(map: Record<K, Chip | string>): { value: K; label: string }[] {
  return (Object.keys(map) as K[]).map((value) => {
    const v = map[value]
    return { value, label: typeof v === 'string' ? v : v.label }
  })
}
