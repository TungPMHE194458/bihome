import type { ApartmentType } from '@/features/apartment/types'

export interface Tier {
  upTo?: number | null
  unitPrice: number
}

export interface FeeRates {
  buildingId: number
  buildingName: string
  vatPercent: number
  dueDay: number
  managementRates: { apartmentType: ApartmentType; unitPrice: number }[]
  electricTiers: Tier[]
  waterTiers: Tier[]
  parkingRates: { assetCategoryId: number; unitPrice: number }[]
  otherCharges: { name: string; amount: number }[]
  categories: { id: number; name: string; unit: string }[]
  version?: number | null
}

export type FeeRatesRequest = Omit<FeeRates, 'buildingId' | 'buildingName' | 'categories'>
