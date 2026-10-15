import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ChipSelect, TimeInput } from '@/components/form'
import { Screen } from '@/components/Screen'
import { Button, Card, ErrorView, Icon, Loading, SectionTitle, TextField } from '@/components/ui'
import { errorMessage } from '@/lib/api'
import { DAYS, DAY_TYPE, PRICE_UNIT } from '@/lib/constants'
import { notify } from '@/lib/dialogs'
import { amenityApi } from '@/lib/staff'
import type {
  AmenityConfig,
  AmenityMaintenance,
  AmenityPriceRule,
  AmenitySlot,
  DayType,
  PriceUnit,
} from '@/lib/types'
import { colors } from '@/theme'

const DAY_TYPE_OPTIONS = (Object.keys(DAY_TYPE) as DayType[]).map((v) => ({ value: v, label: DAY_TYPE[v] }))
const PRICE_UNIT_OPTIONS = (Object.keys(PRICE_UNIT) as PriceUnit[]).map((v) => ({ value: v, label: PRICE_UNIT[v] }))

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + minutes
  const hh = Math.floor((total % (24 * 60)) / 60)
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export default function AmenityConfigScreen() {
  const amenityId = Number(useLocalSearchParams<{ id: string }>().id)
  const config = useQuery({ queryKey: ['amenity-config', amenityId], queryFn: () => amenityApi.config(amenityId) })

  if (config.isLoading) return <Loading />
  if (config.error || !config.data) return <ErrorView message={errorMessage(config.error)} onRetry={() => void config.refetch()} />

  return <ConfigEditor key={config.data.version} amenityId={amenityId} initial={config.data} onSaved={() => config.refetch()} />
}

/** Khởi tạo state sửa từ `initial` qua lazy useState (không cần effect) — `key` ở component cha buộc remount khi lưu xong. */
function ConfigEditor({ amenityId, initial, onSaved }: { amenityId: number; initial: AmenityConfig; onSaved: () => Promise<unknown> }) {
  const qc = useQueryClient()
  const c = initial

  const [slotMinutes, setSlotMinutes] = useState(String(c.slotMinutes))
  const [maxBookingsPerWeek, setMaxBookingsPerWeek] = useState(c.maxBookingsPerWeek != null ? String(c.maxBookingsPerWeek) : '')
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(String(c.maxAdvanceDays))
  const [freeCancelHours, setFreeCancelHours] = useState(String(c.freeCancelHours))
  const [slots, setSlots] = useState<AmenitySlot[]>(c.slots)
  const [prices, setPrices] = useState<AmenityPriceRule[]>(c.prices)
  const [maintenances, setMaintenances] = useState<AmenityMaintenance[]>(c.maintenances)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const slotsForDay = (day: number) => slots.filter((s) => s.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const updateSlot = (day: number, idx: number, patch: Partial<AmenitySlot>) => {
    const daySlots = slotsForDay(day)
    const target = daySlots[idx]
    setSlots(slots.map((s) => (s === target ? { ...s, ...patch } : s)))
  }
  const removeSlot = (day: number, idx: number) => {
    const target = slotsForDay(day)[idx]
    setSlots(slots.filter((s) => s !== target))
  }
  const addSlot = (day: number) => {
    const existing = slotsForDay(day)
    const last = existing[existing.length - 1]
    const start = last ? last.endTime : c.openTime
    const end = addMinutes(start, Number(slotMinutes) || 60)
    if (start >= c.closeTime) return
    setSlots([...slots, { dayOfWeek: day, startTime: start, endTime: end > c.closeTime ? c.closeTime : end, capacity: null }])
  }
  const generateForDay = (day: number) => {
    const others = slots.filter((s) => s.dayOfWeek !== day)
    const generated: AmenitySlot[] = []
    let cursor = c.openTime
    const minutes = Number(slotMinutes) || 60
    while (true) {
      const end = addMinutes(cursor, minutes)
      if (end > c.closeTime) break
      generated.push({ dayOfWeek: day, startTime: cursor, endTime: end, capacity: null })
      cursor = end
    }
    setSlots([...others, ...generated])
  }
  const closeDay = (day: number) => setSlots(slots.filter((s) => s.dayOfWeek !== day))
  /** Sao chép khung giờ của `day` sang 6 ngày còn lại, thay hết khung cũ của các ngày đó. */
  const copyToOthers = (day: number) => {
    const daySlots = slotsForDay(day)
    const own = slots.filter((s) => s.dayOfWeek === day)
    const copied = DAYS.filter((d) => d.value !== day).flatMap((d) => daySlots.map((s) => ({ ...s, dayOfWeek: d.value })))
    setSlots([...own, ...copied])
  }

  const addPrice = () => setPrices([...prices, { dayType: 'WEEKEND', startTime: '08:00', endTime: '17:00', price: 0, priceUnit: 'PER_BOOKING' }])
  const updatePrice = (i: number, patch: Partial<AmenityPriceRule>) => setPrices(prices.map((p, pi) => (pi === i ? { ...p, ...patch } : p)))
  const removePrice = (i: number) => setPrices(prices.filter((_, pi) => pi !== i))

  const addMaintenance = () => {
    const today = new Date().toISOString().slice(0, 10)
    setMaintenances([...maintenances, { startDate: today, endDate: today, reason: '' }])
  }
  const updateMaintenance = (i: number, patch: Partial<AmenityMaintenance>) => setMaintenances(maintenances.map((m, mi) => (mi === i ? { ...m, ...patch } : m)))
  const removeMaintenance = (i: number) => setMaintenances(maintenances.filter((_, mi) => mi !== i))

  const save = async () => {
    setMessage(null)
    for (const d of DAYS) {
      const ds = slotsForDay(d.value)
      for (let i = 1; i < ds.length; i++) {
        if (ds[i].startTime < ds[i - 1].endTime) {
          setMessage(`Khung giờ ${d.label} bị trùng nhau.`)
          return
        }
      }
      if (ds.some((s) => s.startTime < c.openTime || s.endTime > c.closeTime)) {
        setMessage(`Khung giờ ${d.label} nằm ngoài giờ mở cửa ${c.openTime}–${c.closeTime}.`)
        return
      }
    }
    setSaving(true)
    try {
      await amenityApi.saveConfig(amenityId, {
        slotMinutes: Number(slotMinutes) || 60,
        maxBookingsPerWeek: maxBookingsPerWeek.trim() ? Number(maxBookingsPerWeek) : null,
        maxAdvanceDays: Number(maxAdvanceDays) || 0,
        freeCancelHours: Number(freeCancelHours) || 0,
        slots,
        prices,
        maintenances,
        version: c.version,
      })
      void qc.invalidateQueries({ queryKey: ['amenity', amenityId] })
      void onSaved()
      notify('Đã lưu cấu hình')
    } catch (err) {
      setMessage(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen onRefresh={() => onSaved()}>
      <Stack.Screen options={{ title: `Cấu hình ${c.amenityName}` }} />
      {message && <Text style={{ color: colors.danger }}>{message}</Text>}

      <Card style={{ gap: 12 }}>
        <Text style={styles.sectionTitle}>Thiết lập chung</Text>
        <Text style={styles.muted}>Giờ mở cửa {c.openTime}–{c.closeTime} · sức chứa {c.capacity} người (sửa ở trang tiện ích)</Text>
        <TextField label="Mỗi khung dài (phút)" value={slotMinutes} onChangeText={(t) => setSlotMinutes(t.replace(/\D/g, ''))} keyboardType="number-pad" />
        <TextField label="Số lượt tối đa / căn / tuần" value={maxBookingsPerWeek} onChangeText={(t) => setMaxBookingsPerWeek(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Không giới hạn" />
        <TextField label="Đặt trước tối đa (ngày)" value={maxAdvanceDays} onChangeText={(t) => setMaxAdvanceDays(t.replace(/\D/g, ''))} keyboardType="number-pad" />
        <TextField label="Huỷ miễn phí trước (giờ)" value={freeCancelHours} onChangeText={(t) => setFreeCancelHours(t.replace(/\D/g, ''))} keyboardType="number-pad" />
      </Card>

      <SectionTitle title="Khung giờ theo thứ trong tuần" />
      {DAYS.map((d) => {
        const daySlots = slotsForDay(d.value)
        return (
          <Card key={d.value} style={{ gap: 10 }}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayTitle}>{d.label}</Text>
              <View style={{ flexDirection: 'row', gap: 14 }}>
                <Pressable onPress={() => generateForDay(d.value)} hitSlop={6}>
                  <Icon name="auto-fix" size={18} color={colors.primaryDark} />
                </Pressable>
                <Pressable onPress={() => copyToOthers(d.value)} hitSlop={6} disabled={!daySlots.length}>
                  <Icon name="content-copy" size={18} color={daySlots.length ? colors.primaryDark : colors.border} />
                </Pressable>
                <Pressable onPress={() => closeDay(d.value)} hitSlop={6}>
                  <Icon name="close-circle-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>
            {daySlots.length === 0 ? (
              <Text style={styles.muted}>Đóng cửa ngày này.</Text>
            ) : (
              daySlots.map((s, i) => (
                <View key={i} style={styles.slotRow}>
                  <View style={{ flex: 1 }}>
                    <TimeInput label="Bắt đầu" value={s.startTime} onChange={(v) => v && updateSlot(d.value, i, { startTime: v })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TimeInput label="Kết thúc" value={s.endTime} onChange={(v) => v && updateSlot(d.value, i, { endTime: v })} />
                  </View>
                  <Pressable onPress={() => removeSlot(d.value, i)} hitSlop={8} style={{ marginTop: 22 }}>
                    <Icon name="delete-outline" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              ))
            )}
            <Pressable onPress={() => addSlot(d.value)} style={styles.addRow}>
              <Icon name="plus" size={16} color={colors.primaryDark} />
              <Text style={styles.addText}>Thêm khung</Text>
            </Pressable>
          </Card>
        )
      })}

      <SectionTitle title="Giá theo khung giờ" />
      {prices.length === 0 && (
        <Card>
          <Text style={styles.muted}>Chưa có mức giá — mọi lượt đều miễn phí.</Text>
        </Card>
      )}
      {prices.map((p, i) => (
        <Card key={i} style={{ gap: 10 }}>
          <View style={styles.dayHeader}>
            <ChipSelect label="" options={DAY_TYPE_OPTIONS} value={p.dayType} onChange={(v) => v && updatePrice(i, { dayType: v })} />
            <Pressable onPress={() => removePrice(i)} hitSlop={8}>
              <Icon name="delete-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <TimeInput label="Từ" value={p.startTime} onChange={(v) => v && updatePrice(i, { startTime: v })} />
            </View>
            <View style={{ flex: 1 }}>
              <TimeInput label="Đến" value={p.endTime} onChange={(v) => v && updatePrice(i, { endTime: v })} />
            </View>
          </View>
          <TextField label="Giá (đ)" value={String(p.price)} onChangeText={(t) => updatePrice(i, { price: Number(t.replace(/\D/g, '') || '0') })} keyboardType="number-pad" />
          <ChipSelect label="Tính theo" options={PRICE_UNIT_OPTIONS} value={p.priceUnit} onChange={(v) => v && updatePrice(i, { priceUnit: v })} />
        </Card>
      ))}
      <Pressable onPress={addPrice} style={styles.addRow}>
        <Icon name="plus" size={16} color={colors.primaryDark} />
        <Text style={styles.addText}>Thêm mức giá</Text>
      </Pressable>

      <SectionTitle title="Ngày nghỉ bảo trì" />
      {maintenances.length === 0 && (
        <Card>
          <Text style={styles.muted}>Chưa có đợt bảo trì nào.</Text>
        </Card>
      )}
      {maintenances.map((m, i) => (
        <Card key={i} style={{ gap: 10 }}>
          <View style={styles.dayHeader}>
            <Text style={styles.sectionTitle}>Đợt {i + 1}</Text>
            <Pressable onPress={() => removeMaintenance(i)} hitSlop={8}>
              <Icon name="delete-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
          <TextField label="Từ ngày (yyyy-mm-dd)" value={m.startDate} onChangeText={(t) => updateMaintenance(i, { startDate: t })} />
          <TextField label="Đến ngày (yyyy-mm-dd)" value={m.endDate} onChangeText={(t) => updateMaintenance(i, { endDate: t })} />
          <TextField label="Lý do" value={m.reason ?? ''} onChangeText={(t) => updateMaintenance(i, { reason: t })} />
        </Card>
      ))}
      <Pressable onPress={addMaintenance} style={styles.addRow}>
        <Icon name="plus" size={16} color={colors.primaryDark} />
        <Text style={styles.addText}>Thêm đợt bảo trì</Text>
      </Pressable>

      <Button title="Lưu cấu hình" onPress={() => void save()} loading={saving} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.textMuted },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  slotRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  addText: { color: colors.primaryDark, fontWeight: '600', fontSize: 13 },
})
