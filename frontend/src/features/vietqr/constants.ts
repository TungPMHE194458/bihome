import type { ChipStyle } from '@/components/StatusChip'
import type { MatchStatus } from '@/features/vietqr/types'

/** Mã BIN (NAPAS) của một số ngân hàng phổ biến; ngân hàng khác nhập mã BIN 6 số. */
export const BANKS: { bin: string; name: string }[] = [
  { bin: '970436', name: 'Vietcombank' },
  { bin: '970415', name: 'VietinBank' },
  { bin: '970418', name: 'BIDV' },
  { bin: '970405', name: 'Agribank' },
  { bin: '970407', name: 'Techcombank' },
  { bin: '970422', name: 'MB Bank' },
  { bin: '970416', name: 'ACB' },
  { bin: '970432', name: 'VPBank' },
  { bin: '970423', name: 'TPBank' },
  { bin: '970403', name: 'Sacombank' },
  { bin: '970437', name: 'HDBank' },
  { bin: '970441', name: 'VIB' },
  { bin: '970443', name: 'SHB' },
  { bin: '970448', name: 'OCB' },
  { bin: '970426', name: 'MSB' },
  { bin: '970440', name: 'SeABank' },
]

export function bankName(bin?: string | null): string {
  return BANKS.find((b) => b.bin === bin)?.name ?? (bin ? `BIN ${bin}` : '')
}

export const MATCH_STATUS: Record<MatchStatus, ChipStyle> = {
  MATCHED: { label: 'Đã khớp', tone: 'success' },
  MISMATCHED: { label: 'Lệch số tiền', tone: 'warning' },
  UNMATCHED: { label: 'Không khớp', tone: 'danger' },
}

export const MATCH_OPTIONS = (Object.keys(MATCH_STATUS) as MatchStatus[]).map((v) => ({ value: v, label: MATCH_STATUS[v].label }))
