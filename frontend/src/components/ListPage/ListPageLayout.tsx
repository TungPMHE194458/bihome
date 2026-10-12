import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import type { ReactNode } from 'react'
import { PageBreadcrumb } from '@/components/ListPage/PageBreadcrumb'

interface ListPageLayoutProps {
  /** Vd "Danh sách tài liệu". */
  title: string
  /** Thanh tab đặt đầu card (trang có nhiều danh sách, vd Danh mục | Hạng mục). */
  tabs?: ReactNode
  toolbar?: ReactNode
  children: ReactNode
  /** Hiện chip "Tất cả" để bỏ toàn bộ bộ lọc nhanh. */
  onClearFilters?: () => void
  hasFilters?: boolean
  onHistoryClick?: () => void
}

/** Khuôn chung cho mọi trang danh sách: breadcrumb → card chứa toolbar + bảng/lưới + phân trang. */
export function ListPageLayout({
  title,
  tabs,
  toolbar,
  children,
  onClearFilters,
  hasFilters = false,
  onHistoryClick,
}: ListPageLayoutProps) {
  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <PageBreadcrumb title={title} onHistoryClick={onHistoryClick} />
        {onClearFilters && (
          <Chip
            label="Tất cả"
            variant="outlined"
            color={hasFilters ? 'default' : 'primary'}
            onClick={onClearFilters}
            aria-label="Bỏ tất cả bộ lọc"
          />
        )}
      </Box>
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        {tabs && <Box sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>{tabs}</Box>}
        {toolbar && <Box sx={{ p: 1.5 }}>{toolbar}</Box>}
        {children}
      </Paper>
    </Stack>
  )
}
