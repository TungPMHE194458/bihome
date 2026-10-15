import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { DateInput, SearchPicker, Stepper } from '@/components/form'
import { Button, TextField } from '@/components/ui'
import { apartmentApi } from '@/lib/api/apartment'
import { errorMessage, fieldErrors } from '@/lib/api'
import { money } from '@/lib/format'
import { amenityApi, bookingApi } from '@/lib/staff'
import type { ApartmentMember, Availability, Booking, BookingRequest, SlotAvailability } from '@/lib/types'
import { colors, radius } from '@/theme'

/** Tạo lượt đặt tiện ích thủ công cho cư dân (BQL đặt hộ). */
export function BookingForm({ onSaved }: { onSaved: (b: Booking) => void }) {
  const [amenityId, setAmenityId] = useState<number | null>(null)
  const [amenityLabel, setAmenityLabel] = useState<string>()
  const [apartmentId, setApartmentId] = useState<number | null>(null)
  const [apartmentLabel, setApartmentLabel] = useState<string>()
  const [residentId, setResidentId] = useState<number | null>(null)
  const [members, setMembers] = useState<ApartmentMember[]>([])
  const [date, setDate] = useState<string>()
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [availabilityKey, setAvailabilityKey] = useState<string | null>(null)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [slot, setSlot] = useState<SlotAvailability | null>(null)
  const [peopleCount, setPeopleCount] = useState(1)
  const [voucherCode, setVoucherCode] = useState('')
  const [note, setNote] = useState('')
  const [quote, setQuote] = useState<{ fee: number; discount: number; total: number; requiresApproval: boolean } | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!amenityId || !date) return
    const key = `${amenityId}|${date}`
    bookingApi
      .availability(amenityId, date, 1)
      .then((a) => {
        setAvailability(a)
        setAvailabilityKey(key)
        setAvailabilityError(null)
      })
      .catch((e) => setAvailabilityError(errorMessage(e)))
  }, [amenityId, date])

  /** Khoá/ngày đổi thì dữ liệu khung giờ cũ coi như chưa khớp cho tới khi tải xong (tránh setState đồng bộ trong effect). */
  const day = amenityId && date && availabilityKey === `${amenityId}|${date}` ? availability?.days[0] : undefined
  const effectiveSlot = slot && day?.slots.find((s) => s.startTime === slot.startTime && s.endTime === slot.endTime) ? slot : null

  const buildBody = (): BookingRequest | null => {
    if (!amenityId || !apartmentId || !date || !effectiveSlot || peopleCount <= 0) return null
    return {
      amenityId,
      apartmentId,
      residentId,
      bookingDate: date,
      startTime: effectiveSlot.startTime,
      endTime: effectiveSlot.endTime,
      peopleCount,
      voucherCode: voucherCode.trim() ? voucherCode.trim().toUpperCase() : null,
      note: note.trim() || null,
    }
  }

  useEffect(() => {
    const body = buildBody()
    if (!body) return
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      bookingApi
        .quote(body)
        .then((q) => {
          setQuote(q)
          setQuoteError(null)
        })
        .catch((e) => {
          setQuote(null)
          setQuoteError(errorMessage(e))
        })
    }, 400)
    return () => clearTimeout(debounce.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amenityId, apartmentId, residentId, date, effectiveSlot, peopleCount, voucherCode])

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!amenityId) e.amenity = 'Vui lòng chọn tiện ích'
    if (!apartmentId) e.apartment = 'Vui lòng chọn căn hộ'
    if (!date) e.date = 'Vui lòng chọn ngày'
    if (!effectiveSlot) e.slot = 'Vui lòng chọn khung giờ'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    const body = buildBody()
    if (!body) return
    setSaving(true)
    try {
      onSaved(await bookingApi.create(body))
    } catch (err) {
      setErrors(fieldErrors(err))
      setMessage(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const canQuote = !!buildBody()

  return (
    <View style={{ gap: 16 }}>
      {message && <Text style={{ color: colors.danger }}>{message}</Text>}
      <SearchPicker
        label="Tiện ích"
        required
        value={amenityId}
        valueLabel={amenityLabel}
        onSearch={(k) => amenityApi.options().then((os) => os.filter((o) => !k || o.name.toLowerCase().includes(k.toLowerCase())).map((o) => ({ value: o.id, label: `${o.code} · ${o.name}` })))}
        onChange={(v, o) => {
          setAmenityId(v)
          setAmenityLabel(o?.label)
        }}
        error={errors.amenity}
      />
      <SearchPicker
        label="Căn hộ"
        required
        value={apartmentId}
        valueLabel={apartmentLabel}
        onSearch={(k) => apartmentApi.options(k).then((os) => os.map((o) => ({ value: o.id, label: `${o.code} · ${o.name}`, sublabel: o.buildingName })))}
        onChange={(v, o) => {
          setApartmentId(v)
          setApartmentLabel(o?.label)
          setResidentId(null)
          if (v) void apartmentApi.members(v).then(setMembers)
          else setMembers([])
        }}
        error={errors.apartment}
      />
      {apartmentId != null && (
        <SearchPicker
          label="Cư dân (không bắt buộc)"
          value={residentId}
          options={members.filter((m) => m.residenceStatus !== 'MOVED_OUT').map((m) => ({ value: m.residentId, label: m.fullName }))}
          onChange={setResidentId}
        />
      )}
      <DateInput label="Ngày sử dụng *" value={date} onChange={setDate} minimumDate={new Date()} error={errors.date} />

      {amenityId && date && (
        <View style={{ gap: 6 }}>
          <Text style={styles.label}>Khung giờ {errors.slot ? <Text style={{ color: colors.danger }}> *</Text> : null}</Text>
          {availabilityError ? (
            <Text style={{ color: colors.danger, fontSize: 13 }}>{availabilityError}</Text>
          ) : day?.closedReason ? (
            <Text style={{ color: colors.danger, fontSize: 13 }}>{day.closedReason}</Text>
          ) : !day?.slots.length ? (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>Không có khung giờ.</Text>
          ) : (
            <View style={styles.slots}>
              {day.slots.map((s) => {
                const disabled = s.past || s.remaining <= 0
                const active = effectiveSlot?.startTime === s.startTime
                return (
                  <Pressable
                    key={s.startTime}
                    disabled={disabled}
                    onPress={() => setSlot(s)}
                    style={[styles.slotChip, active && styles.slotChipActive, disabled && styles.slotChipDisabled]}
                  >
                    <Text style={[styles.slotText, active && styles.slotTextActive]}>
                      {s.startTime}–{s.endTime}
                    </Text>
                    <Text style={[styles.slotSub, active && styles.slotTextActive]}>
                      {disabled ? (s.past ? 'Đã qua' : 'Hết chỗ') : `Còn ${s.remaining}`}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>
      )}

      <View style={{ gap: 6 }}>
        <Text style={styles.label}>Số người</Text>
        <Stepper value={peopleCount} onChange={setPeopleCount} min={1} max={effectiveSlot?.capacity ?? 999} />
      </View>
      <TextField label="Mã voucher" value={voucherCode} onChangeText={(t) => setVoucherCode(t.toUpperCase())} autoCapitalize="characters" />
      <TextField label="Ghi chú" value={note} onChangeText={setNote} multiline />

      {canQuote && quoteError && <Text style={{ color: colors.danger, fontSize: 13 }}>{quoteError}</Text>}
      {canQuote && quote && (
        <View style={styles.quote}>
          <Text style={styles.quoteLine}>Phí: {money(quote.fee)}</Text>
          {quote.discount > 0 && <Text style={styles.quoteLine}>Voucher − {money(quote.discount)}</Text>}
          <Text style={styles.quoteTotal}>Tổng: {money(quote.total)}</Text>
          <Text style={styles.quoteLine}>{quote.requiresApproval ? 'Cần duyệt sau khi gửi' : 'Tự động duyệt'}</Text>
        </View>
      )}

      <Button title="Tạo lượt đặt" onPress={() => void submit()} loading={saving} />
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: 12, minWidth: 110 },
  slotChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotChipDisabled: { opacity: 0.4 },
  slotText: { fontSize: 14, fontWeight: '600', color: colors.text },
  slotSub: { fontSize: 12, color: colors.textMuted },
  slotTextActive: { color: '#fff' },
  quote: { backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: 12, gap: 4 },
  quoteLine: { fontSize: 14, color: colors.text },
  quoteTotal: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
})
