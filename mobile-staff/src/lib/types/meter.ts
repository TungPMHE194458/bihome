/** Số liệu điện nước. */

export type MeterType = 'ELECTRIC' | 'WATER'

export interface SheetRow {
  apartmentId: number
  apartmentCode: string
  floorNo: string
  oldIndex?: number
  previousPeriod?: string
  averageConsumption?: number
  readingId?: number
  newIndex?: number
  consumption?: number
  spike: boolean
  locked: boolean
  version?: number
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
