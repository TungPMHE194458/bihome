import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableSortLabel from '@mui/material/TableSortLabel'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { ColumnFilter } from '@/components/DataTable/ColumnFilter'
import { ListPagination } from '@/components/DataTable/ListPagination'
import { RowActionMenu } from '@/components/DataTable/RowActionMenu'
import type { Column, FilterValues, PaginationProps, RowAction } from '@/components/DataTable/types'

/** Bỏ trống phân trang cho bảng ngắn hiển thị toàn bộ dòng (vd lịch sử cư trú). */
export interface DataTableProps<T> extends Partial<PaginationProps> {
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string | number
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  filters?: FilterValues
  onFilterChange?: (key: string, value: string) => void
  /** Dạng "field,asc" | "field,desc". */
  sort?: string
  onSortChange?: (sort: string | undefined) => void
  rowActions?: (row: T) => RowAction[]
  onRowClick?: (row: T) => void
  /** Tô đỏ dòng cần chú ý (vd yêu cầu quá hạn SLA). */
  highlightRow?: (row: T) => boolean
  emptyMessage?: string
  emptyAction?: ReactNode
}

const stickyRight = {
  position: 'sticky',
  right: 0,
  bgcolor: 'background.paper',
  boxShadow: 'inset 1px 0 0 rgba(0,0,0,0.06)',
  zIndex: 1,
} as const

export function parseSort(sort?: string): { field?: string; direction: 'asc' | 'desc' } {
  if (!sort) return { direction: 'asc' }
  const [field, direction] = sort.split(',')
  return { field, direction: direction === 'desc' ? 'desc' : 'asc' }
}

/** Bấm tiêu đề cột: tăng dần → giảm dần → bỏ sắp xếp (về mặc định của API). */
function nextSort(current: string | undefined, field: string): string | undefined {
  const { field: currentField, direction } = parseSort(current)
  if (currentField !== field) return `${field},asc`
  return direction === 'asc' ? `${field},desc` : undefined
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  loading = false,
  error,
  onRetry,
  filters = {},
  onFilterChange,
  sort,
  onSortChange,
  rowActions,
  onRowClick,
  highlightRow,
  emptyMessage,
  emptyAction,
  ...pagination
}: DataTableProps<T>) {
  const showFilterRow = !!onFilterChange && columns.some((c) => c.filter)
  const colSpan = columns.length + (rowActions ? 1 : 0)
  const current = parseSort(sort)

  let body: ReactNode
  if (loading) {
    body = Array.from({ length: 5 }, (_, i) => (
      <TableRow key={`skeleton-${i}`}>
        {Array.from({ length: colSpan }, (_, j) => (
          <TableCell key={j}>
            <Skeleton variant="text" />
          </TableCell>
        ))}
      </TableRow>
    ))
  } else if (error) {
    body = (
      <TableRow>
        <TableCell colSpan={colSpan}>
          <ErrorState error={error} onRetry={onRetry} />
        </TableCell>
      </TableRow>
    )
  } else if (rows.length === 0) {
    body = (
      <TableRow>
        <TableCell colSpan={colSpan}>
          <EmptyState message={emptyMessage} action={emptyAction} />
        </TableCell>
      </TableRow>
    )
  } else {
    body = rows.map((row) => (
      <TableRow
        key={getRowId(row)}
        hover
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        data-highlighted={highlightRow?.(row) ? 'true' : undefined}
        sx={{
          ...(onRowClick ? { cursor: 'pointer' } : {}),
          ...(highlightRow?.(row)
            ? { bgcolor: '#FEF2F2', '& > td:first-of-type': { boxShadow: 'inset 3px 0 0 #DC2626' } }
            : {}),
        }}
      >
        {columns.map((c) => (
          <TableCell key={c.key} align={c.align}>
            {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
          </TableCell>
        ))}
        {rowActions && (
          <TableCell align="center" sx={stickyRight} onClick={(e) => e.stopPropagation()}>
            <RowActionMenu actions={rowActions(row)} />
          </TableCell>
        )}
      </TableRow>
    ))
  }

  return (
    <Box>
      <TableContainer>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              {columns.map((c) => {
                const sortField = c.sortKey ?? c.key
                const active = current.field === sortField
                return (
                  <TableCell
                    key={c.key}
                    align={c.align}
                    sx={{ width: c.width, minWidth: c.minWidth, py: 1.5 }}
                    sortDirection={active ? current.direction : false}
                  >
                    {c.sortable && onSortChange ? (
                      <TableSortLabel
                        active={active}
                        direction={active ? current.direction : 'asc'}
                        onClick={() => onSortChange(nextSort(sort, sortField))}
                      >
                        {c.header}
                      </TableSortLabel>
                    ) : (
                      c.header
                    )}
                  </TableCell>
                )
              })}
              {rowActions && (
                <TableCell align="center" sx={{ ...stickyRight, width: 72 }}>
                  Tác vụ
                </TableCell>
              )}
            </TableRow>
            {showFilterRow && onFilterChange && (
              <TableRow>
                {columns.map((c) => (
                  <TableCell key={c.key} sx={{ py: 0.75, verticalAlign: 'bottom' }}>
                    {c.filter ? (
                      <ColumnFilter
                        columnKey={c.key}
                        header={c.header}
                        def={c.filter}
                        values={filters}
                        onChange={onFilterChange}
                      />
                    ) : (
                      <Box sx={{ borderBottom: '1px dotted', borderColor: 'grey.400', height: 26 }} />
                    )}
                  </TableCell>
                ))}
                {rowActions && <TableCell sx={stickyRight} />}
              </TableRow>
            )}
          </TableHead>
          <TableBody>{body}</TableBody>
        </Table>
      </TableContainer>
      {isPaginated(pagination) && <ListPagination {...pagination} />}
    </Box>
  )
}

function isPaginated(p: Partial<PaginationProps>): p is PaginationProps {
  return p.onPageChange != null && p.onSizeChange != null && p.page != null && p.size != null && p.total != null
}
