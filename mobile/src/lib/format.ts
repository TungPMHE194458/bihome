import dayjs from 'dayjs'

/** 1500000 → "1.500.000 đ" (không phụ thuộc Intl của Hermes). */
export function money(value: number | null | undefined): string {
  const n = Math.round(Number(value ?? 0))
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${n < 0 ? '-' : ''}${s} đ`
}

export const formatDate = (v?: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—')
export const formatDateTime = (v?: string | null) => (v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '—')

/** "2026-10" → "Tháng 10/2026" */
export function periodLabel(period: string): string {
  const [y, m] = period.split('-')
  return `Tháng ${Number(m)}/${y}`
}

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

/** "2026-10-13" → "T2 13/10" */
export function shortDay(date: string): string {
  const d = dayjs(date)
  return `${WEEKDAYS[d.day()]} ${d.format('DD/MM')}`
}

export function timeAgo(v: string): string {
  const minutes = dayjs().diff(dayjs(v), 'minute')
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  const days = Math.floor(hours / 24)
  return days < 7 ? `${days} ngày trước` : formatDate(v)
}
