import dayjs, { APP_TIMEZONE } from '@/lib/dayjs'

/** Kỳ thu phí dạng yyyy-MM (giống backend). */
export type Period = string

export function currentPeriod(): Period {
  return dayjs().tz(APP_TIMEZONE).format('YYYY-MM')
}

export function shiftPeriod(period: Period, months: number): Period {
  return dayjs(`${period}-01`).add(months, 'month').format('YYYY-MM')
}

/** "2026-09" → "09/2026". */
export function formatPeriod(period?: string | null): string {
  if (!period) return ''
  const [y, m] = period.split('-')
  return `${m}/${y}`
}

/** {@code count} kỳ gần nhất tính tới tháng hiện tại (mới nhất trước) cho ô chọn kỳ. */
export function periodOptions(count = 12): { value: string; label: string }[] {
  const now = currentPeriod()
  return Array.from({ length: count }, (_, i) => {
    const p = shiftPeriod(now, -i)
    return { value: p, label: `Tháng ${formatPeriod(p)}` }
  })
}
