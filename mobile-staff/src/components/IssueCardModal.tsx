import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { DateInput, SearchPicker } from '@/components/form'
import { Button, TextField } from '@/components/ui'
import { apartmentApi } from '@/lib/api/apartment'
import { assetApi } from '@/lib/api/asset'
import { errorMessage, fieldErrors } from '@/lib/api'
import { allowsVehicle } from '@/lib/types'
import { accessCardApi } from '@/lib/staff'
import type { AccessCard, ApartmentOption, IssueRequest } from '@/lib/types'
import { colors } from '@/theme'

export function IssueCardModal({ visible, card, onClose, onSaved }: { visible: boolean; card: AccessCard; onClose: () => void; onSaved: (c: AccessCard) => void }) {
  const [apartmentId, setApartmentId] = useState<number | null>(null)
  const [apartmentLabel, setApartmentLabel] = useState<string>()
  const [, setApartmentOptions] = useState<ApartmentOption[]>([])
  const [residentId, setResidentId] = useState<number | null>(null)
  const [assetItemId, setAssetItemId] = useState<number | null>(null)
  const residents = useQuery({ queryKey: ['apartment-members-issue', apartmentId], queryFn: () => apartmentApi.members(apartmentId!), enabled: apartmentId != null })
  const vehicles = useQuery({
    queryKey: ['asset-items-issue', apartmentId],
    queryFn: () => assetApi.items({ apartmentId: apartmentId!, status: 'ACTIVE', size: 50 }),
    enabled: apartmentId != null && allowsVehicle(card.cardType),
  })
  const [issuedDate, setIssuedDate] = useState<string | undefined>(new Date().toISOString().slice(0, 10))
  const [expiryDate, setExpiryDate] = useState<string | undefined>()
  const [issueFee, setIssueFee] = useState('0')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!apartmentId) e.apartment = 'Vui lòng chọn căn hộ'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    const body: IssueRequest = {
      apartmentId: apartmentId!,
      residentId,
      assetItemId,
      issuedDate: issuedDate || null,
      expiryDate: expiryDate || null,
      issueFee: Number(issueFee || '0'),
      note: note.trim() || null,
      version: card.version,
    }
    setSaving(true)
    try {
      onSaved(await accessCardApi.issue(card.id, body))
    } catch (err) {
      setErrors(fieldErrors(err))
      setMessage(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={styles.close}>Đóng</Text>
        </Pressable>
        <Text style={styles.title}>Cấp thẻ {card.cardNo}</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {message && <Text style={{ color: colors.danger }}>{message}</Text>}
        <SearchPicker
          label="Căn hộ"
          required
          value={apartmentId}
          valueLabel={apartmentLabel}
          onSearch={(k) =>
            apartmentApi.options(k).then((os) => {
              setApartmentOptions(os)
              return os.map((o) => ({ value: o.id, label: `${o.code} · ${o.name}`, sublabel: o.buildingName }))
            })
          }
          onChange={(v, o) => {
            setApartmentId(v)
            setApartmentLabel(o?.label)
            setResidentId(null)
            setAssetItemId(null)
          }}
          error={errors.apartment}
        />
        {apartmentId != null && (
          <SearchPicker
            label="Cư dân (không bắt buộc)"
            value={residentId}
            options={(residents.data ?? []).filter((m) => m.residenceStatus !== 'MOVED_OUT').map((m) => ({ value: m.residentId, label: m.fullName }))}
            onChange={setResidentId}
          />
        )}
        {apartmentId != null && allowsVehicle(card.cardType) && (
          <SearchPicker
            label="Xe liên kết (không bắt buộc)"
            value={assetItemId}
            options={(vehicles.data?.content ?? []).map((v) => ({ value: v.id, label: `${v.plateNumber ?? v.name} · ${v.categoryName}` }))}
            onChange={setAssetItemId}
          />
        )}
        <DateInput label="Ngày cấp" value={issuedDate} onChange={setIssuedDate} />
        <DateInput label="Ngày hết hạn" value={expiryDate} onChange={setExpiryDate} />
        <TextField label="Phí cấp thẻ (đ)" value={issueFee} onChangeText={(t) => setIssueFee(t.replace(/\D/g, ''))} keyboardType="number-pad" />
        <TextField label="Ghi chú" value={note} onChangeText={setNote} multiline />
        <Button title="Cấp thẻ" onPress={() => void submit()} loading={saving} />
      </ScrollView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  close: { color: colors.primaryDark, fontWeight: '600', fontSize: 15 },
})
