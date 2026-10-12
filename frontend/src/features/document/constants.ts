import type { SelectOption } from '@/components/DataTable/types'
import type { ChipStyle } from '@/components/StatusChip'
import type { DocumentAudience } from '@/features/document/types'
import type { ActiveStatus } from '@/lib/api-types'

export const AUDIENCE: Record<DocumentAudience, string> = {
  ALL_RESIDENTS: 'Toàn bộ cư dân',
  OWNERS: 'Chủ sở hữu',
  TENANTS: 'Người thuê',
  MANAGEMENT: 'Nội bộ ban quản lý',
}

export const AUDIENCE_OPTIONS: SelectOption[] = (Object.keys(AUDIENCE) as DocumentAudience[]).map((value) => ({
  value,
  label: AUDIENCE[value],
}))

export const CATEGORY_STATUS: Record<ActiveStatus, ChipStyle> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' },
}

export const CATEGORY_STATUS_OPTIONS: SelectOption[] = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động' },
]

/** Bảng màu gợi ý cho chip danh mục (vẫn cho nhập mã màu tuỳ ý). */
export const CATEGORY_COLORS = [
  '#16A34A',
  '#0D9488',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#DC2626',
  '#EA580C',
  '#CA8A04',
  '#4B5563',
]

/** Loại tệp xem trước được trong trình duyệt. */
export const canPreview = (contentType: string) => contentType === 'application/pdf' || contentType.startsWith('image/')
