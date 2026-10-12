import dayjs, { APP_TIMEZONE } from '@/lib/dayjs'

/** Luôn hiển thị theo giờ Việt Nam, bất kể múi giờ của máy người dùng. */
export function formatDateTime(value?: string | null): string {
  if (!value) return ''
  return dayjs(value).tz(APP_TIMEZONE).format('DD/MM/YYYY HH:mm')
}

/** Ngày thuần (YYYY-MM-DD) không có múi giờ nên không quy đổi. */
export function formatDate(value?: string | null): string {
  if (!value) return ''
  return dayjs(value).format('DD/MM/YYYY')
}

export function formatFileSize(bytes?: number | null): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const numberFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

export function formatNumber(value?: number | null): string {
  if (value == null) return ''
  return numberFormatter.format(value)
}

export function formatArea(value?: number | null): string {
  return value == null ? '' : `${formatNumber(value)} m²`
}

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

export function formatCurrency(value?: number | null): string {
  if (value == null) return ''
  return currencyFormatter.format(value)
}

/** Bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu ("toa nha" khớp "Tòa nhà"). */
export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}
