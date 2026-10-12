export type MeterType = 'ELECTRIC' | 'WATER'

export interface MeterReading {
  id: number
  buildingId: number
  buildingName: string
  apartmentId: number
  apartmentCode: string
  floorNo: string
  period: string
  meterType: MeterType
  oldIndex: number
  newIndex: number
  consumption: number
  averageConsumption?: number | null
  spike: boolean
  locked: boolean
  firstReading: boolean
  imageFileId?: number | null
  imageUrl?: string | null
  note?: string | null
  createdBy?: string | null
  createdAt: string
  updatedBy?: string | null
  updatedAt?: string | null
  version: number
}

export interface PreviousInfo {
  oldIndex?: number | null
  previousPeriod?: string | null
  averageConsumption?: number | null
  locked: boolean
  existingId?: number | null
}

export interface MeterReadingRequest {
  apartmentId?: number
  period?: string
  meterType?: MeterType
  oldIndex?: number | null
  newIndex: number
  imageFileId?: number | null
  note?: string | null
  version?: number
}

export interface SheetRow {
  apartmentId: number
  apartmentCode: string
  floorNo: string
  oldIndex?: number | null
  previousPeriod?: string | null
  averageConsumption?: number | null
  readingId?: number | null
  newIndex?: number | null
  consumption?: number | null
  spike: boolean
  locked: boolean
  version?: number | null
}

export interface MeterSheet {
  period: string
  meterType: MeterType
  floors: string[]
  rows: SheetRow[]
}

export interface SheetEntry {
  apartmentId: number
  oldIndex?: number | null
  newIndex?: number | null
}
