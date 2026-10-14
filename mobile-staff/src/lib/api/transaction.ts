import { clean, data, http, type Params } from '@/lib/api/shared'
import { downloadExcel } from '@/lib/file'
import type { PageResponse, Transaction } from '@/lib/types'

export const transactionApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<Transaction>>('/transactions', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  export: (p: Params) =>
    (async () => {
      const qs = new URLSearchParams(clean(p) as Record<string, string>).toString()
      await downloadExcel(`/transactions/export${qs ? `?${qs}` : ''}`, 'giao-dich.xlsx')
    })(),
}
