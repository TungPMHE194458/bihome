import type {
  Service,
  ServiceOption,
  ServiceOrder,
  ServiceOrderQuote,
  ServiceOrderRequest,
  ServiceRequest,
  ServiceType,
  ServiceTypeOption,
  ServiceTypeRequest,
} from '@/features/servicecatalog/types'
import type { PaymentMethod } from '@/features/transaction/types'
import type { ActiveStatus, PageResponse } from '@/lib/api-types'
import { http } from '@/lib/http'

export type ListParams = Record<string, string | number>

/** Loại dịch vụ dùng chung mọi tòa nên gọi không kèm X-Building-Id; dịch vụ thì theo tòa đang chọn. */
export const serviceApi = {
  types: (params: ListParams) =>
    http.get<PageResponse<ServiceType>>('/service-types', { params, skipBuildingContext: true }).then((r) => r.data),
  typeOptions: () =>
    http.get<ServiceTypeOption[]>('/service-types/options', { skipBuildingContext: true }).then((r) => r.data),
  type: (id: number) => http.get<ServiceType>(`/service-types/${id}`, { skipBuildingContext: true }).then((r) => r.data),
  saveType: (id: number | undefined, body: ServiceTypeRequest) =>
    (id == null
      ? http.post<ServiceType>('/service-types', body, { skipBuildingContext: true })
      : http.put<ServiceType>(`/service-types/${id}`, body, { skipBuildingContext: true })
    ).then((r) => r.data),
  typeStatus: (id: number, status: ActiveStatus) =>
    http.patch<ServiceType>(`/service-types/${id}/status`, { status }, { skipBuildingContext: true }).then((r) => r.data),
  removeType: (id: number) => http.delete<void>(`/service-types/${id}`, { skipBuildingContext: true }),

  list: (params: ListParams) => http.get<PageResponse<Service>>('/services', { params }).then((r) => r.data),
  options: (buildingId?: number) =>
    http.get<ServiceOption[]>('/services/options', { params: { buildingId } }).then((r) => r.data),
  get: (id: number) => http.get<Service>(`/services/${id}`).then((r) => r.data),
  save: (id: number | undefined, body: ServiceRequest) =>
    (id == null ? http.post<Service>('/services', body) : http.put<Service>(`/services/${id}`, body)).then((r) => r.data),
  changeStatus: (id: number, status: ActiveStatus) =>
    http.patch<Service>(`/services/${id}/status`, { status }).then((r) => r.data),
  remove: (id: number) => http.delete<void>(`/services/${id}`),

  orders: (params: ListParams) => http.get<PageResponse<ServiceOrder>>('/service-orders', { params }).then((r) => r.data),
  quoteOrder: (body: ServiceOrderRequest) => http.post<ServiceOrderQuote>('/service-orders/quote', body).then((r) => r.data),
  createOrder: (body: ServiceOrderRequest) => http.post<ServiceOrder>('/service-orders', body).then((r) => r.data),
  confirmOrder: (id: number, version: number) =>
    http.post<ServiceOrder>(`/service-orders/${id}/confirm`, { version }).then((r) => r.data),
  completeOrder: (id: number, version: number) =>
    http.post<ServiceOrder>(`/service-orders/${id}/complete`, { version }).then((r) => r.data),
  cancelOrder: (id: number, reason: string, version: number) =>
    http.post<ServiceOrder>(`/service-orders/${id}/cancel`, { reason, version }).then((r) => r.data),
  payOrder: (id: number, method: PaymentMethod) =>
    http.post<ServiceOrder>(`/service-orders/${id}/pay`, { method }).then((r) => r.data),
}
