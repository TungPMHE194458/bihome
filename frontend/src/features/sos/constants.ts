import type { ChipStyle } from '@/components/StatusChip'
import type { SosStatus, SosType } from '@/features/sos/types'

export const SOS_TYPE_LABEL: Record<SosType, string> = {
  FIRE: 'Cháy nổ',
  MEDICAL: 'Cấp cứu y tế',
  SECURITY: 'An ninh',
  ELEVATOR: 'Kẹt thang máy',
  OTHER: 'Khẩn cấp khác',
}

export const SOS_TYPE_OPTIONS = (Object.keys(SOS_TYPE_LABEL) as SosType[]).map((v) => ({ value: v, label: SOS_TYPE_LABEL[v] }))

export const SOS_STATUS: Record<SosStatus, ChipStyle> = {
  NEW: { label: 'Mới', tone: 'danger' },
  ACKNOWLEDGED: { label: 'Đã tiếp nhận', tone: 'warning' },
  RESOLVED: { label: 'Đã xử lý', tone: 'success' },
  FALSE_ALARM: { label: 'Báo nhầm', tone: 'neutral' },
}

export const SOS_STATUS_OPTIONS = (Object.keys(SOS_STATUS) as SosStatus[]).map((v) => ({ value: v, label: SOS_STATUS[v].label }))

export const isOpen = (s: SosStatus) => s === 'NEW' || s === 'ACKNOWLEDGED'

/** Nơi xảy ra: căn hộ + vị trí. */
export function sosPlace(a: { apartmentCode?: string | null; location?: string | null }): string {
  return [a.apartmentCode ? `Căn ${a.apartmentCode}` : null, a.location].filter(Boolean).join(' · ')
}

/**
 * Âm báo ngắn bằng Web Audio (không cần tệp âm thanh). Trình duyệt có thể chặn khi người dùng chưa tương tác với
 * trang — khi đó bỏ qua im lặng.
 */
export function playAlarm() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const gain = ctx.createGain()
    gain.gain.value = 0.15
    gain.connect(ctx.destination)
    ;[0, 0.35, 0.7].forEach((start) => {
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = 880
      osc.connect(gain)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + 0.2)
    })
    window.setTimeout(() => void ctx.close(), 1200)
  } catch {
    // Không phát được âm báo: badge đỏ vẫn hiển thị.
  }
}
