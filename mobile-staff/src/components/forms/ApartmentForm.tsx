import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Switch, Text, View } from 'react-native'
import { ChipSelect } from '@/components/form'
import { Button, TextField } from '@/components/ui'
import { errorMessage, fieldErrors } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { APARTMENT_STATUS, APARTMENT_TYPE, OWNERSHIP_TYPE, USAGE_STATUS } from '@/lib/constants'
import { apartmentApi, buildingApi } from '@/lib/staff'
import type { ApartmentDetail, ApartmentRequest, ApartmentType, OwnershipType, UsageStatus } from '@/lib/types'
import { colors } from '@/theme'

const TYPE_OPTIONS = (Object.keys(APARTMENT_TYPE) as ApartmentType[]).map((v) => ({ value: v, label: APARTMENT_TYPE[v].label }))
const OWNERSHIP_OPTIONS = (Object.keys(OWNERSHIP_TYPE) as OwnershipType[]).map((v) => ({ value: v, label: OWNERSHIP_TYPE[v].label }))
const USAGE_OPTIONS = (Object.keys(USAGE_STATUS) as UsageStatus[]).map((v) => ({ value: v, label: USAGE_STATUS[v].label }))

/** Dùng chung cho tạo mới và sửa. Tạo mới luôn vào tòa đang chọn (giống web — không đổi được tòa sau khi tạo). */
export function ApartmentForm({ apartment, onSaved }: { apartment?: ApartmentDetail; onSaved: (a: ApartmentDetail) => void }) {
  const { buildingId } = useAuth()
  const building = useQuery({ queryKey: ['building', apartment?.buildingId ?? buildingId], queryFn: () => buildingApi.get((apartment?.buildingId ?? buildingId)!), enabled: (apartment?.buildingId ?? buildingId) != null })

  const [code, setCode] = useState(apartment?.code ?? '')
  const [name, setName] = useState(apartment?.name ?? '')
  const [floorNo, setFloorNo] = useState(apartment?.floorNo ?? '')
  const [bedrooms, setBedrooms] = useState(apartment?.bedrooms != null ? String(apartment.bedrooms) : '')
  const [rooms, setRooms] = useState(apartment?.rooms != null ? String(apartment.rooms) : '')
  const [area, setArea] = useState(apartment?.area != null ? String(apartment.area) : '')
  const [type, setType] = useState<ApartmentType>(apartment?.type ?? 'APARTMENT')
  const [ownershipType, setOwnershipType] = useState<OwnershipType>(apartment?.ownershipType ?? 'OWN')
  const [usageStatus, setUsageStatus] = useState<UsageStatus>(apartment?.usageStatus ?? 'VACANT')
  const [description, setDescription] = useState(apartment?.description ?? '')
  const [active, setActive] = useState((apartment?.status ?? 'ACTIVE') === 'ACTIVE')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const effectiveBuildingId = apartment?.buildingId ?? buildingId

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!code.trim()) e.code = 'Vui lòng nhập mã căn'
    else if (!/^[A-Za-z0-9._-]+$/.test(code.trim())) e.code = 'Chỉ gồm chữ không dấu, số và . _ -'
    if (!name.trim()) e.name = 'Vui lòng nhập tên căn'
    if (!floorNo.trim()) e.floorNo = 'Vui lòng nhập tầng'
    const areaNum = Number(area.replace(',', '.'))
    if (!area.trim() || !(areaNum > 0)) e.area = 'Diện tích phải lớn hơn 0'
    setErrors(e)
    setMessage(null)
    if (Object.keys(e).length) return
    if (!effectiveBuildingId) {
      setMessage('Chọn một tòa nhà trước khi thêm căn hộ.')
      return
    }

    const body: ApartmentRequest = {
      buildingId: effectiveBuildingId,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      floorNo: floorNo.trim().toUpperCase(),
      bedrooms: bedrooms.trim() ? Number(bedrooms) : null,
      rooms: rooms.trim() ? Number(rooms) : null,
      area: areaNum,
      type,
      ownershipType,
      usageStatus,
      description: description.trim() || null,
      status: active ? 'ACTIVE' : 'INACTIVE',
      images: apartment?.images.map((i) => ({ fileId: i.fileId, cover: i.cover })) ?? [],
      version: apartment?.version,
    }
    setSaving(true)
    try {
      const saved = await apartmentApi.save(apartment?.id, body)
      onSaved(saved)
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
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>
        Tòa nhà: <Text style={{ fontWeight: '700', color: colors.text }}>{building.data?.name ?? '—'}</Text>
        {apartment ? '' : ' (không đổi được sau khi tạo)'}
      </Text>
      <TextField label="Mã căn hộ *" value={code} onChangeText={setCode} autoCapitalize="characters" error={errors.code} />
      <TextField label="Tên căn hộ *" value={name} onChangeText={setName} error={errors.name} />
      <TextField label="Tầng *" value={floorNo} onChangeText={(t) => setFloorNo(t.toUpperCase())} error={errors.floorNo} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TextField label="Phòng ngủ" value={bedrooms} onChangeText={(t) => setBedrooms(t.replace(/\D/g, ''))} keyboardType="number-pad" style={{ flex: 1 }} />
        <TextField label="Số phòng" value={rooms} onChangeText={(t) => setRooms(t.replace(/\D/g, ''))} keyboardType="number-pad" style={{ flex: 1 }} />
      </View>
      <TextField label="Diện tích (m²) *" value={area} onChangeText={setArea} keyboardType="decimal-pad" error={errors.area} />
      <ChipSelect label="Loại" required options={TYPE_OPTIONS} value={type} onChange={(v) => v && setType(v)} />
      <ChipSelect label="Hình thức" required options={OWNERSHIP_OPTIONS} value={ownershipType} onChange={(v) => v && setOwnershipType(v)} />
      <ChipSelect label="Tình trạng sử dụng" required options={USAGE_OPTIONS} value={usageStatus} onChange={(v) => v && setUsageStatus(v)} />
      <TextField label="Mô tả" value={description} onChangeText={setDescription} multiline />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.primary }} />
        <Text style={{ color: colors.text }}>{active ? APARTMENT_STATUS.ACTIVE.label : APARTMENT_STATUS.INACTIVE.label}</Text>
      </View>
      <Button title={apartment ? 'Lưu thay đổi' : 'Thêm căn hộ'} onPress={() => void submit()} loading={saving} />
    </View>
  )
}
