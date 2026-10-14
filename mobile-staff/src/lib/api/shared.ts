import type { AxiosRequestConfig } from 'axios'
import { http } from '@/lib/api'

export type Params = Record<string, string | number | boolean | undefined | null>

export const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)
/** Bỏ tham số rỗng để không gửi "keyword=" lên backend. Nhận cả interface cụ thể (vd ReportParams), không chỉ Params. */
export const clean = <P extends Record<string, unknown>>(p: P) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== '')) as Partial<P>
/** API dùng chung mọi tòa (không gửi X-Building-Id). */
export const noBuilding: AxiosRequestConfig = { headers: { 'X-Building-Id': null } as unknown as AxiosRequestConfig['headers'] }

export { http }
