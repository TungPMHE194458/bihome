import type { Chip } from '@/lib/constants/common'
import type { DocumentAudience } from '@/lib/types'

export const DOCUMENT_AUDIENCE: Record<DocumentAudience, string> = {
  ALL_RESIDENTS: 'Toàn bộ cư dân',
  OWNERS: 'Chủ sở hữu',
  TENANTS: 'Người thuê',
  MANAGEMENT: 'Nội bộ ban quản lý',
}

export const DOCUMENT_CATEGORY_STATUS: Record<'ACTIVE' | 'INACTIVE', Chip> = {
  ACTIVE: { label: 'Hoạt động', tone: 'success' },
  INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' },
}

export const CATEGORY_COLORS = [
  '#16A34A', '#0D9488', '#2563EB', '#7C3AED', '#DB2777', '#DC2626', '#EA580C', '#CA8A04', '#4B5563',
]
