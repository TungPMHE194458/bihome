import { clean, data, http, noBuilding, type Params } from '@/lib/api/shared'
import type {
  PageResponse,
  PaymentMethod,
  Service,
  ServiceOption,
  ServiceOrder,
  ServiceOrderQuote,
  ServiceOrderRequest,
  ServiceRequest,
  ServiceType,
  ServiceTypeOption,
  ServiceTypeRequest,
} from '@/lib/types'

export const serviceApi = {
  list: (p: Params) =>
    data(http.get<PageResponse<Service>>('/services', { params: clean({ size: 20, sort: 'code,asc', ...p }) })),
  options: (buildingId?: number) => data(http.get<ServiceOption[]>('/services/options', { params: clean({ buildingId }) })),
  get: (id: number) => data(http.get<Service>(`/services/${id}`)),
  save: (id: number | undefined, body: ServiceRequest) =>
    data(id == null ? http.post<Service>('/services', body) : http.put<Service>(`/services/${id}`, body)),
  status: (id: number, status: 'ACTIVE' | 'INACTIVE') => data(http.patch<Service>(`/services/${id}/status`, { status })),
  remove: (id: number) => http.delete(`/services/${id}`),

  // Loại dịch vụ dùng chung mọi tòa.
  types: (p: Params) =>
    data(http.get<PageResponse<ServiceType>>('/service-types', { params: clean({ size: 20, sort: 'name,asc', ...p }), ...noBuilding })),
  typeOptions: () => data(http.get<ServiceTypeOption[]>('/service-types/options', noBuilding)),
  type: (id: number) => data(http.get<ServiceType>(`/service-types/${id}`, noBuilding)),
  saveType: (id: number | undefined, body: ServiceTypeRequest) =>
    data(
      id == null
        ? http.post<ServiceType>('/service-types', body, noBuilding)
        : http.put<ServiceType>(`/service-types/${id}`, body, noBuilding),
    ),
  typeStatus: (id: number, status: 'ACTIVE' | 'INACTIVE') =>
    data(http.patch<ServiceType>(`/service-types/${id}/status`, { status }, noBuilding)),
  removeType: (id: number) => http.delete(`/service-types/${id}`, noBuilding),

  orders: (p: Params) =>
    data(http.get<PageResponse<ServiceOrder>>('/service-orders', { params: clean({ size: 20, sort: 'createdAt,desc', ...p }) })),
  order: (id: number) => data(http.get<ServiceOrder>(`/service-orders/${id}`)),
  quoteOrder: (body: ServiceOrderRequest) => data(http.post<ServiceOrderQuote>('/service-orders/quote', body)),
  createOrder: (body: ServiceOrderRequest) => data(http.post<ServiceOrder>('/service-orders', body)),
  confirmOrder: (id: number, version: number) => data(http.post<ServiceOrder>(`/service-orders/${id}/confirm`, { version })),
  completeOrder: (id: number, version: number) => data(http.post<ServiceOrder>(`/service-orders/${id}/complete`, { version })),
  cancelOrder: (id: number, reason: string, version: number) =>
    data(http.post<ServiceOrder>(`/service-orders/${id}/cancel`, { reason, version })),
  payOrder: (id: number, method: PaymentMethod) => data(http.post<ServiceOrder>(`/service-orders/${id}/pay`, { method })),
}
