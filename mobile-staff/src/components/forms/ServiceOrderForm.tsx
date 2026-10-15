import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { DateInput, SearchPicker, Stepper, TimeInput } from '@/components/form'
import { Button, TextField } from '@/components/ui'
import { apartmentApi } from '@/lib/api/apartment'
import { errorMessage, fieldErrors } from '@/lib/api'
import { money } from '@/lib/format'
import { serviceApi } from '@/lib/staff'
import type { ApartmentMember, ServiceOption, ServiceOrder, ServiceOrderQuote, ServiceOrderRequest } from '@/lib/types'
import { colors, radius } from '@/theme'

/** Tạo đơn dịch vụ thủ công cho cư dân (BQL đặt hộ) — dùng quote trực tiếp khi đủ dữ liệu. */
export function ServiceOrderForm({ onSaved }: { onSaved: (o: ServiceOrder) => void }) {
  const [serviceId, setServiceId] = useState<number | null>(null)
  const [serviceLabel, setServiceLabel] = useState<string>()
  const [apartmentId, setApartmentId] = useState<number | null>(null)
  const [apartmentLabel, setApartmentLabel] = useState<string>()
  const [residentId, setResidentId] = useState<number | null>(null)
  const [members, setMembers] = useState<ApartmentMember[]>([])
  const [quantity, setQuantity] = useState(1)
  const [scheduledDate, setScheduledDate] = useState<string>()
  const [scheduledTime, setScheduledTime] = useState<string>()
  const [voucherCode, setVoucherCode] = useState('')
  const [note, setNote] = useState('')
  const [quote, setQuote] = useState<ServiceOrderQuote | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  const buildBody = (): ServiceOrderRequest | null => {
    if (!serviceId || !apartmentId || quantity <= 0) return null
    return {
      serviceId,
      apartmentId,
      residentId,
      quantity,
      scheduledAt: scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}:00+07:00` : null,
      voucherCode: voucherCode.trim() ? voucherCode.trim().toUpperCase() : null,
      note: note.trim() || null,
    }
  }

  useEffect(() => {
    const body = buildBody()
    if (!body) return
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      serviceApi
        .quoteOrder(body)
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
  }, [serviceId, apartmentId, residentId, quantity, voucherCode])

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!serviceId) e.service = 'Vui lòng chọn dịch vụ'
    if (!apartmentId) e.apartment = 'Vui lòng chọn căn hộ'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    const body = buildBody()
    if (!body) return
    setSaving(true)
    try {
      onSaved(await serviceApi.createOrder(body))
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
        label="Dịch vụ"
        required
        value={serviceId}
        valueLabel={serviceLabel}
        onSearch={(k) => serviceApi.options().then((os: ServiceOption[]) => os.filter((o) => !k || o.name.toLowerCase().includes(k.toLowerCase())).map((o) => ({ value: o.id, label: o.name, sublabel: `${money(o.unitPrice)} / ${o.unit}` })))}
        onChange={(v, o) => {
          setServiceId(v)
          setServiceLabel(o?.label)
        }}
        error={errors.service}
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
      <View style={{ gap: 6 }}>
        <Text style={styles.label}>Số lượng</Text>
        <Stepper value={quantity} onChange={setQuantity} min={1} max={999} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <DateInput label="Ngày hẹn" value={scheduledDate} onChange={setScheduledDate} minimumDate={new Date()} />
        <View style={{ flex: 1 }}>
          <TimeInput label="Giờ hẹn" value={scheduledTime} onChange={setScheduledTime} />
        </View>
      </View>
      <TextField label="Mã voucher" value={voucherCode} onChangeText={(t) => setVoucherCode(t.toUpperCase())} autoCapitalize="characters" />
      <TextField label="Ghi chú" value={note} onChangeText={setNote} multiline />

      {canQuote && quoteError && <Text style={{ color: colors.danger, fontSize: 13 }}>{quoteError}</Text>}
      {canQuote && quote && (
        <View style={styles.quote}>
          <Text style={styles.quoteLine}>{quantity} {quote.unit} × {money(quote.unitPrice)} = {money(quote.amount)}</Text>
          {quote.discount > 0 && <Text style={styles.quoteLine}>Voucher {quote.voucherCode} − {money(quote.discount)}</Text>}
          <Text style={styles.quoteTotal}>Tổng: {money(quote.total)}</Text>
        </View>
      )}

      <Button title="Tạo đơn" onPress={() => void submit()} loading={saving} />
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  quote: { backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: 12, gap: 4 },
  quoteLine: { fontSize: 14, color: colors.text },
  quoteTotal: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
})
