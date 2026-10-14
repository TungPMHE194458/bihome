/** Dịch vụ + loại dịch vụ + đơn dịch vụ. Khớp frontend/src/features/servicecatalog/types.ts. */
import type { ActiveStatus } from './common'
import type { TransactionSummary } from './transaction'

export interface ServiceType {
  id: number
  name: string
  description?: string
  status: ActiveStatus
  serviceCount: number
  createdAt: string
  updatedAt: string
  version: number
}

export interface ServiceTypeOption {
  id: number
  name: string
}

export interface ServiceTypeRequest {
  name: string
  description: string | null
  status: ActiveStatus
  version?: number
}

export interface Service {
  id: number
  buildingId: number
  buildingName: string
  code: string
  name: string
  serviceTypeId: number
  serviceTypeName: string
  unitPrice: number
  unit: string
  description?: string
  status: ActiveStatus
  images: { fileId: number; url: string; cover: boolean }[]
  coverImageUrl?: string
  createdAt: string
  updatedAt: string
  createdBy?: string
  version: number
}

export interface ServiceOption {
  id: number
  code: string
  name: string
  unitPrice: number
  unit: string
  buildingId: number
}

export interface ServiceRequest {
  /** null = tự sinh DV0001... */
  code: string | null
  name: string
  serviceTypeId: number
  unitPrice: number
  unit: string
  description: string | null
  status: ActiveStatus
  images: { fileId: number; cover: boolean }[]
  version?: number
}

export type ServiceOrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

export interface ServiceOrder {
  id: number
  buildingId: number
  buildingName: string
  code: string
  serviceId: number
  serviceCode: string
  serviceName: string
  apartmentId: number
  apartmentCode: string
  residentId?: number
  residentName?: string
  quantity: number
  unitPrice: number
  unit: string
  amount: number
  voucherCode?: string
  discount: number
  total: number
  scheduledAt?: string
  status: ServiceOrderStatus
  note?: string
  cancelReason?: string
  completedAt?: string
  transaction?: TransactionSummary
  createdAt: string
  createdBy?: string
  version: number
}

export interface ServiceOrderRequest {
  serviceId: number
  apartmentId: number
  residentId: number | null
  quantity: number
  scheduledAt: string | null
  voucherCode: string | null
  note: string | null
}

export interface ServiceOrderQuote {
  unitPrice: number
  unit: string
  amount: number
  voucherCode?: string
  discount: number
  total: number
}
