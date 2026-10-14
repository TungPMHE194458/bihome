import type { IconName } from '@/components/ui'
import type { MeterType } from '@/lib/types'

export const METER_TYPE: Record<MeterType, { label: string; unit: string; icon: IconName }> = {
  ELECTRIC: { label: 'Điện', unit: 'kWh', icon: 'flash' },
  WATER: { label: 'Nước', unit: 'm³', icon: 'water' },
}

/** Giống backend: tiêu thụ > 3 lần trung bình 3 kỳ trước thì cảnh báo. */
export const SPIKE_RATIO = 3

export function isSpike(consumption: number | null | undefined, average: number | null | undefined): boolean {
  return consumption != null && average != null && average > 0 && consumption > average * SPIKE_RATIO
}
