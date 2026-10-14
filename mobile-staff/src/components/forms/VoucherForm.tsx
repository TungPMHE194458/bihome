import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { ChipSelect, DateInput } from '@/components/form'
import { Button, Icon, TextField } from '@/components/ui'
import { amenityApi } from '@/lib/api/amenity'
import { serviceApi } from '@/lib/api/service'
import { errorMessage, fieldErrors } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { APPLY_SCOPE, DISCOUNT_TYPE, VOUCHER_STATUS } from '@/lib/constants'
import { voucherApi } from '@/lib/staff'
import type { ApplyScope, DiscountType, Voucher, VoucherRequest } from '@/lib/types'
import { colors } from '@/theme'

const DISCOUNT_OPTIONS = (Object.keys(DISCOUNT_TYPE) as DiscountType[]).map((v) => ({ value: v, label: DISCOUNT_TYPE[v] }))
const SCOPE_OPTIONS = (Object.keys(APPLY_SCOPE) as ApplyScope[]).map((v) => ({ value: v, label: APPLY_SCOPE[v] }))

export function VoucherForm({ voucher, onSaved }: { voucher?: Voucher; onSaved: (v: Voucher) => void }) {
  const { buildingId } = useAuth()
  const locked = voucher?.valueLocked ?? false
  const effectiveBuildingId = voucher?.buildingId ?? buildingId
  const [code, setCode] = useState(voucher?.code ?? '')
  const [name, setName] = useState(voucher?.name ?? '')
  const [description, setDescription] = useState(voucher?.description ?? '')
  const [discountType, setDiscountType] = useState<DiscountType>(voucher?.discountType ?? 'PERCENT')
  const [discountValue, setDiscountValue] = useState(voucher?.discountValue != null ? String(voucher.discountValue) : '')
  const [maxDiscount, setMaxDiscount] = useState(voucher?.maxDiscount != null ? String(voucher.maxDiscount) : '')
  const [applyScope, setApplyScope] = useState<ApplyScope>(voucher?.applyScope ?? 'ALL')
  const [amenityIds, setAmenityIds] = useState<Set<number>>(new Set(voucher?.amenities.map((a) => a.id) ?? []))
  const [serviceIds, setServiceIds] = useState<Set<number>>(new Set(voucher?.services.map((s) => s.id) ?? []))
  const amenities = useQuery({ queryKey: ['amenity-options', effectiveBuildingId], queryFn: () => amenityApi.options(effectiveBuildingId ?? undefined), enabled: applyScope === 'AMENITY' })
  const services = useQuery({ queryKey: ['service-options', effectiveBuildingId], queryFn: () => serviceApi.options(effectiveBuildingId ?? undefined), enabled: applyScope === 'SERVICE' })
  const [totalQuantity, setTotalQuantity] = useState(voucher?.totalQuantity != null ? String(voucher.totalQuantity) : '')
  const [perApartmentLimit, setPerApartmentLimit] = useState(voucher?.perApartmentLimit != null ? String(voucher.perApartmentLimit) : '')
  const [validFrom, setValidFrom] = useState<string | undefined>(voucher?.validFrom ?? new Date().toISOString().slice(0, 10))
  const [validTo, setValidTo] = useState<string | undefined>(voucher?.validTo)
  const [active, setActive] = useState((voucher?.status ?? 'ACTIVE') === 'ACTIVE')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const toggleSet = (set: Set<number>, setter: (s: Set<number>) => void, id: number) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
      else next.add(id)
    setter(next)
  }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!code.trim()) e.code = 'Vui lòng nhập mã voucher'
    if (!name.trim()) e.name = 'Vui lòng nhập tên voucher'
    const dv = Number(discountValue.replace(',', '.'))
    if (!discountValue.trim() || !(dv > 0)) e.discountValue = 'Giá trị giảm phải lớn hơn 0'
    else if (discountType === 'PERCENT' && dv > 100) e.discountValue = 'Giảm theo % tối đa 100'
    if (!validFrom || !validTo) e.validTo = 'Vui lòng chọn ngày hiệu lực'
    else if (validTo < validFrom) e.validTo = 'Ngày kết thúc phải sau ngày bắt đầu'
    const limit = perApartmentLimit.trim() ? Number(perApartmentLimit) : null
    const total = totalQuantity.trim() ? Number(totalQuantity) : null
    if (limit != null && total != null && limit > total) e.perApartmentLimit = 'Giới hạn mỗi căn phải ≤ tổng lượt'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return

    const body: VoucherRequest = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: description.trim() || null,
      discountType,
      discountValue: dv,
      maxDiscount: discountType === 'PERCENT' && maxDiscount.trim() ? Number(maxDiscount) : null,
      applyScope,
      amenityIds: applyScope === 'AMENITY' ? Array.from(amenityIds) : [],
      serviceIds: applyScope === 'SERVICE' ? Array.from(serviceIds) : [],
      totalQuantity: total,
      perApartmentLimit: limit,
      validFrom: validFrom!,
      validTo: validTo!,
      status: active ? 'ACTIVE' : 'INACTIVE',
      version: voucher?.version,
    }
    setSaving(true)
    try {
      onSaved(await voucherApi.save(voucher?.id, body))
    } catch (err) {
      setErrors(fieldErrors(err))
      setMessage(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ gap: 16 }}>
      {message && <Text style={{ color: colors.danger }}>{message}</Text>}
      {locked && <Text style={{ color: colors.warning, fontSize: 13 }}>Voucher đã có lượt dùng nên không sửa được mã, loại/giá trị giảm và phạm vi áp dụng.</Text>}
      <TextField label="Mã voucher *" value={code} onChangeText={(t) => setCode(t.toUpperCase())} editable={!locked} error={errors.code} />
      <TextField label="Tên voucher *" value={name} onChangeText={setName} error={errors.name} />
      <TextField label="Mô tả" value={description} onChangeText={setDescription} multiline />
      <ChipSelect label="Loại giảm giá" required options={DISCOUNT_OPTIONS} value={discountType} onChange={(v) => v && !locked && setDiscountType(v)} />
      <TextField label={discountType === 'PERCENT' ? 'Giá trị giảm (%) *' : 'Giá trị giảm (đ) *'} value={discountValue} onChangeText={setDiscountValue} keyboardType="decimal-pad" editable={!locked} error={errors.discountValue} />
      {discountType === 'PERCENT' && <TextField label="Giảm tối đa (đ)" value={maxDiscount} onChangeText={(t) => setMaxDiscount(t.replace(/\D/g, ''))} keyboardType="number-pad" editable={!locked} />}
      <ChipSelect label="Phạm vi áp dụng" required options={SCOPE_OPTIONS} value={applyScope} onChange={(v) => v && !locked && setApplyScope(v)} />
      {applyScope === 'AMENITY' && !locked && (
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Tiện ích áp dụng (bỏ trống = mọi tiện ích)</Text>
          {(amenities.data ?? []).map((a) => (
            <Pressable key={a.id} onPress={() => toggleSet(amenityIds, setAmenityIds, a.id)} style={styles.checkRow}>
              <Icon name={amenityIds.has(a.id) ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={amenityIds.has(a.id) ? colors.primary : colors.textMuted} />
              <Text style={styles.checkText}>{a.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {applyScope === 'SERVICE' && !locked && (
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>Dịch vụ áp dụng (bỏ trống = mọi dịch vụ)</Text>
          {(services.data ?? []).map((s) => (
            <Pressable key={s.id} onPress={() => toggleSet(serviceIds, setServiceIds, s.id)} style={styles.checkRow}>
              <Icon name={serviceIds.has(s.id) ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={serviceIds.has(s.id) ? colors.primary : colors.textMuted} />
              <Text style={styles.checkText}>{s.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <TextField label="Tổng số lượt" value={totalQuantity} onChangeText={(t) => setTotalQuantity(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Bỏ trống = không giới hạn" />
      <TextField label="Giới hạn mỗi căn" value={perApartmentLimit} onChangeText={(t) => setPerApartmentLimit(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="Bỏ trống = không giới hạn" error={errors.perApartmentLimit} />
      <DateInput label="Hiệu lực từ *" value={validFrom} onChange={setValidFrom} />
      <DateInput label="Hiệu lực đến *" value={validTo} onChange={setValidTo} error={errors.validTo} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.primary }} />
        <Text style={{ color: colors.text }}>{active ? VOUCHER_STATUS.ACTIVE.label : VOUCHER_STATUS.INACTIVE.label}</Text>
      </View>
      <Button title={voucher ? 'Lưu thay đổi' : 'Thêm voucher'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '500', color: colors.text },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checkText: { fontSize: 14, color: colors.text },
})
