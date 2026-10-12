import TablePagination from '@mui/material/TablePagination'
import type { PaginationProps } from '@/components/DataTable/types'

export const PAGE_SIZES = [10, 20, 50]

export function ListPagination({ page, size, total, onPageChange, onSizeChange }: PaginationProps) {
  // MUI cảnh báo khi page vượt quá số trang (vd sau khi lọc còn ít bản ghi hơn).
  const lastPage = Math.max(0, Math.ceil(total / size) - 1)
  return (
    <TablePagination
      component="div"
      count={total}
      page={Math.min(page, lastPage)}
      rowsPerPage={size}
      rowsPerPageOptions={PAGE_SIZES}
      onPageChange={(_, next) => onPageChange(next)}
      onRowsPerPageChange={(e) => onSizeChange(Number(e.target.value))}
      labelRowsPerPage="Số hàng mỗi trang:"
      labelDisplayedRows={({ from, to, count }) => `${from}–${to} trong ${count}`}
      getItemAriaLabel={(type) =>
        ({ first: 'Trang đầu', last: 'Trang cuối', next: 'Trang sau', previous: 'Trang trước' })[type]
      }
      sx={{ borderTop: 1, borderColor: 'divider' }}
    />
  )
}
