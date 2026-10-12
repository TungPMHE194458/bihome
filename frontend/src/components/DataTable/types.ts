import type { ReactNode } from 'react'

export interface SelectOption {
  value: string
  label: string
}

export type ColumnFilterDef =
  | { type: 'text'; placeholder?: string }
  | { type: 'select'; options: SelectOption[] }
  /** Lọc khoảng ngày: ghi vào hai tham số riêng (vd createdFrom / createdTo), giá trị YYYY-MM-DD. */
  | { type: 'dateRange'; fromKey: string; toKey: string }

export interface Column<T> {
  /** Khoá cột; cũng là tên tham số lọc gửi lên API cho filter text/select. */
  key: string
  header: string
  render?: (row: T) => ReactNode
  width?: number | string
  minWidth?: number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  /** Tên trường sắp xếp gửi lên API nếu khác key. */
  sortKey?: string
  filter?: ColumnFilterDef
}

export interface RowAction {
  label: string
  icon?: ReactNode
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

export interface PaginationProps {
  page: number
  size: number
  total: number
  onPageChange: (page: number) => void
  onSizeChange: (size: number) => void
}

export type FilterValues = Record<string, string | undefined>
