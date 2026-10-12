import type { Transaction } from '@/features/transaction/types'
import type { PageResponse } from '@/lib/api-types'
import { downloadFromApi } from '@/lib/files'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

const filtersOnly = (params: ListParams) =>
  Object.fromEntries(Object.entries(params).filter(([k]) => !['page', 'size', 'sort'].includes(k)))

export const transactionApi = {
  list: (params: ListParams) => http.get<PageResponse<Transaction>>('/transactions', { params }).then((r) => r.data),
  exportExcel: (params: ListParams) => downloadFromApi('/transactions/export', filtersOnly(params), 'giao-dich.xlsx'),
}
