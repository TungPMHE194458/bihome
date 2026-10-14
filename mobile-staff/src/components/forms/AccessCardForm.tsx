import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { ChipSelect, DateInput, SearchPicker } from '@/components/form'
import { Button, TextField } from '@/components/ui'
import { apartmentApi } from '@/lib/api/apartment'
import { assetApi } from '@/lib/api/asset'
import { errorMessage, fieldErrors } from '@/lib/api'
import { CARD_TYPE } from '@/lib/constants'
import { allowsVehicle } from '@/lib/types'
import { accessCardApi } from '@/lib/staff'
import type { AccessCard, AccessCardRequest, CardType } from '@/lib/types'
import { colors } from '@/theme'

const TYPE_OPTIONS = (Object.keys(CARD_TYPE) as CardType[]).map((v) => ({ value: v, label: CARD_TYPE[v].label }))

/** Tạo mới / sửa thông tin thẻ. Có chọn căn hộ thì thẻ được cấp ngay (IN_USE); bỏ trống = nhập kho (IN_STOCK). */
export function AccessCardForm({ card, onSaved }: { card?: AccessCard; onSaved: (c: AccessCard) => void }) {
  const locked = !!card && card.status !== 'IN_USE' && card.status !== 'LOCKED'
  const [cardNo, setCardNo] = useState(card?.cardNo ?? '')
  const [cardType, setCardType] = useState<CardType>(card?.cardType ?? 'MULTI')
  const [apartmentId, setApartmentId] = useState<number | null>(card?.apartmentId ?? null)
  const [apartmentLabel, setApartmentLabel] = useState(card?.apartmentId ? `${card.apartmentCode} · ${card.apartmentName}` : undefined)
  const [residentId, setResidentId] = useState<number | null>(card?.residentId ?? null)
  const [assetItemId, setAssetItemId] = useState<number | null>(card?.assetItemId ?? null)
  const vehicles = useQuery({
    queryKey: ['asset-items-for-card', apartmentId],
    queryFn: () => assetApi.items({ apartmentId: apartmentId!, status: 'ACTIVE', size: 50 }),
    enabled: apartmentId != null && allowsVehicle(cardType),
  })
  const residents = useQuery({
    queryKey: ['apartment-members-for-card', apartmentId],
    queryFn: () => apartmentApi.members(apartmentId!),
    enabled: apartmentId != null,
  })
  const [issuedDate, setIssuedDate] = useState<string | undefined>(card?.issuedDate)
  const [expiryDate, setExpiryDate] = useState<string | undefined>(card?.expiryDate)
  const [issueFee, setIssueFee] = useState(card?.issueFee != null ? String(card.issueFee) : '0')
  const [note, setNote] = useState(card?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!cardNo.trim()) e.cardNo = 'Vui lòng nhập mã thẻ'
    if (expiryDate && issuedDate && expiryDate < issuedDate) e.expiryDate = 'Ngày hết hạn phải sau ngày cấp'
    if (assetItemId && !allowsVehicle(cardType)) e.assetItemId = 'Chỉ thẻ Gửi xe hoặc Đa năng mới liên kết được với xe.'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return

    const body: AccessCardRequest = {
      cardNo: cardNo.trim().replace(/\s+/g, ' ').toUpperCase(),
      cardType,
      apartmentId,
      residentId,
      assetItemId,
      issuedDate: issuedDate || null,
      expiryDate: expiryDate || null,
      issueFee: Number(issueFee || '0'),
      note: note.trim() || null,
      version: card?.version,
    }
    setSaving(true)
    try {
      onSaved(await accessCardApi.save(card?.id, body))
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
      {locked && (
        <Text style={{ color: colors.warning, fontSize: 13 }}>
          Thẻ đang ở trạng thái không gán được — chỉ sửa khi thẻ Đang dùng hoặc Khoá.
        </Text>
      )}
      <TextField label="Mã thẻ *" value={cardNo} onChangeText={(t) => setCardNo(t.toUpperCase())} autoCapitalize="characters" error={errors.cardNo} />
      <ChipSelect label="Loại thẻ" required options={TYPE_OPTIONS} value={cardType} onChange={(v) => v && setCardType(v)} />
      <SearchPicker
        label="Căn hộ"
        value={apartmentId}
        valueLabel={apartmentLabel}
        onSearch={(k) => apartmentApi.options(k).then((os) => os.map((o) => ({ value: o.id, label: `${o.code} · ${o.name}`, sublabel: o.buildingName })))}
        onChange={(v, o) => {
          setApartmentId(v)
          setApartmentLabel(o?.label)
          setResidentId(null)
          setAssetItemId(null)
        }}
      />
      {apartmentId != null && (
        <SearchPicker
          label="Cư dân (không bắt buộc)"
          value={residentId}
          options={(residents.data ?? []).filter((m) => m.residenceStatus !== 'MOVED_OUT').map((m) => ({ value: m.residentId, label: m.fullName }))}
          onChange={setResidentId}
        />
      )}
      {apartmentId != null && allowsVehicle(cardType) && (
        <SearchPicker
          label="Xe liên kết (không bắt buộc)"
          value={assetItemId}
          options={(vehicles.data?.content ?? []).map((v) => ({ value: v.id, label: `${v.plateNumber ?? v.name} · ${v.categoryName}` }))}
          onChange={setAssetItemId}
          error={errors.assetItemId}
        />
      )}
      <DateInput label="Ngày cấp" value={issuedDate} onChange={setIssuedDate} />
      <DateInput label="Ngày hết hạn" value={expiryDate} onChange={setExpiryDate} error={errors.expiryDate} />
      <TextField label="Phí cấp thẻ (đ)" value={issueFee} onChangeText={(t) => setIssueFee(t.replace(/\D/g, ''))} keyboardType="number-pad" />
      <TextField label="Ghi chú" value={note} onChangeText={setNote} multiline />
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>
        {apartmentId ? 'Có căn hộ → thẻ được cấp ngay (Đang dùng).' : 'Bỏ trống căn hộ → thẻ nhập kho, cấp sau.'}
      </Text>
      <Button title={card ? 'Lưu thay đổi' : 'Thêm thẻ'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}
