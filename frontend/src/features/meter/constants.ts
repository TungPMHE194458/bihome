import type { MeterType } from '@/features/meter/types'

export const METER_TYPE_LABEL: Record<MeterType, string> = { ELECTRIC: 'Điện', WATER: 'Nước' }
export const METER_UNIT: Record<MeterType, string> = { ELECTRIC: 'kWh', WATER: 'm³' }

export const METER_TYPE_OPTIONS = (Object.keys(METER_TYPE_LABEL) as MeterType[]).map((v) => ({
  value: v,
  label: METER_TYPE_LABEL[v],
}))

/** Giống backend: tiêu thụ > 3 lần trung bình 3 kỳ trước (tăng > 200%) thì cảnh báo. */
export const SPIKE_RATIO = 3

export function isSpike(consumption: number | null | undefined, average: number | null | undefined): boolean {
  return consumption != null && average != null && average > 0 && consumption > average * SPIKE_RATIO
}
