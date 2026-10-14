import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import { ChipSelect, DateInput, SearchPicker } from '@/components/form'
import { Button } from '@/components/ui'
import { apartmentApi } from '@/lib/api/apartment'
import { errorMessage, fieldErrors } from '@/lib/api'
import { ACTIVE_RESIDENCE_STATUSES, RELATIONSHIP, RESIDENCE_STATUS, RESIDENT_ROLE } from '@/lib/constants'
import { residentApi } from '@/lib/staff'
import type { LinkRequest, Relationship, ResidenceStatus, ResidentDetail, ResidentLink, ResidentRole } from '@/lib/types'
import { colors } from '@/theme'

const ROLE_OPTIONS = (Object.keys(RESIDENT_ROLE) as ResidentRole[]).map((v) => ({ value: v, label: RESIDENT_ROLE[v].label }))
const RELATIONSHIP_OPTIONS = (Object.keys(RELATIONSHIP) as Relationship[]).map((v) => ({ value: v, label: RELATIONSHIP[v] }))
const STATUS_OPTIONS = ACTIVE_RESIDENCE_STATUSES.map((v) => ({ value: v, label: RESIDENCE_STATUS[v].label }))

/** Gán căn hộ mới (link = undefined) hoặc sửa cư trú hiện có (apartment bị khoá). */
export function ResidenceLinkModal({
  visible,
  residentId,
  link,
  onClose,
  onSaved,
}: {
  visible: boolean
  residentId: number
  link?: ResidentLink
  onClose: () => void
  onSaved: (r: ResidentDetail) => void
}) {
  const [apartmentId, setApartmentId] = useState<number | null>(link?.apartmentId ?? null)
  const [apartmentLabel, setApartmentLabel] = useState(link ? `${link.apartmentCode} · ${link.apartmentName}` : undefined)
  const [role, setRole] = useState<ResidentRole>(link?.role ?? 'FAMILY')
  const [relationship, setRelationship] = useState<Relationship | null>(link?.relationship ?? null)
  const [householdHead, setHouseholdHead] = useState(link?.householdHead ?? false)
  const [moveInDate, setMoveInDate] = useState<string | undefined>(link?.moveInDate ?? new Date().toISOString().slice(0, 10))
  const [moveOutDate, setMoveOutDate] = useState<string | undefined>(link?.moveOutDate)
  const [status, setStatus] = useState<ResidenceStatus>(link?.residenceStatus === 'TEMP_ABSENT' ? 'TEMP_ABSENT' : 'LIVING')
  const [tempRegistered, setTempRegistered] = useState(link?.tempResidenceRegistered ?? false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!apartmentId) e.apartment = 'Vui lòng chọn căn hộ'
    if (!moveInDate) e.moveInDate = 'Vui lòng chọn ngày vào ở'
    if (moveOutDate && moveInDate && moveOutDate < moveInDate) e.moveOutDate = 'Ngày chuyển đi phải sau ngày vào ở'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return

    const body: LinkRequest = {
      apartmentId: apartmentId!,
      role,
      relationship,
      householdHead: role === 'OWNER' ? householdHead : false,
      moveInDate: moveInDate!,
      moveOutDate: moveOutDate || null,
      residenceStatus: moveOutDate && moveOutDate <= new Date().toISOString().slice(0, 10) ? 'MOVED_OUT' : status,
      tempResidenceRegistered: tempRegistered,
      version: link?.version,
    }
    setSaving(true)
    try {
      const saved = link ? await residentApi.updateLink(residentId, link.id, body) : await residentApi.assignApartment(residentId, body)
      onSaved(saved)
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
        <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Đóng">
          <Text style={styles.close}>Đóng</Text>
        </Pressable>
        <Text style={styles.title}>{link ? 'Sửa cư trú' : 'Gán căn hộ'}</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        {message && <Text style={{ color: colors.danger }}>{message}</Text>}
        <SearchPicker
          label="Căn hộ"
          required
          value={apartmentId}
          valueLabel={apartmentLabel}
          onSearch={(k) => apartmentApi.options(k).then((os) => os.map((o) => ({ value: o.id, label: `${o.code} · ${o.name}`, sublabel: o.buildingName })))}
          onChange={(v, o) => {
            setApartmentId(v)
            setApartmentLabel(o?.label)
          }}
          error={errors.apartment}
        />
        <ChipSelect label="Vai trò" required options={ROLE_OPTIONS} value={role} onChange={(v) => v && setRole(v)} />
        <ChipSelect label="Quan hệ với chủ hộ" options={RELATIONSHIP_OPTIONS} value={relationship} onChange={setRelationship} />
        {role === 'OWNER' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Switch value={householdHead} onValueChange={setHouseholdHead} trackColor={{ true: colors.primary }} />
            <Text style={{ color: colors.text }}>Là chủ hộ chính</Text>
          </View>
        )}
        <DateInput label="Ngày vào ở *" value={moveInDate} onChange={setMoveInDate} error={errors.moveInDate} />
        {link && <DateInput label="Ngày chuyển đi" value={moveOutDate} onChange={setMoveOutDate} error={errors.moveOutDate} />}
        {(!moveOutDate || moveOutDate > new Date().toISOString().slice(0, 10)) && (
          <ChipSelect label="Tình trạng" required options={STATUS_OPTIONS} value={status} onChange={(v) => v && setStatus(v)} />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Switch value={tempRegistered} onValueChange={setTempRegistered} trackColor={{ true: colors.primary }} />
          <Text style={{ color: colors.text }}>Đã đăng ký tạm trú</Text>
        </View>
        <Button title={link ? 'Lưu thay đổi' : 'Gán căn hộ'} onPress={() => void submit()} loading={saving} />
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
